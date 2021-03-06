const router = require('express').Router();
const {User, Order, Product, OrderProduct} = require('../db/models');
const {isLoggedIn} = require('../api/routeProtections');

const buildCartProducts = async orderId => {
  const allProducts = await Product.findAll({});
  const cartItems = await OrderProduct.findAll({
    where: {
      orderId
    },
    order: [['createdAt', 'DESC']]
  });

  // let cartProduct = {};
  let cartProductDetails = cartItems.map(orderProduct => {
    let thisProduct = {};
    allProducts.forEach(product => {
      if (product.id === orderProduct.productId) {
        thisProduct.id = product.id;
        thisProduct.name = product.name;
        thisProduct.slug = product.slug;
        thisProduct.imageUrl = product.imageUrl;
        thisProduct.price = orderProduct.price;
        thisProduct.quantity = orderProduct.quantity;
      }
    });
    return thisProduct;
  });

  return cartProductDetails;
};

// CART
// ----
// RESTful approach is to use GET, POST, PUT, and DELETE
// to View, Add, Edit, and Remove, respectfully.
// So:
// GET    / => VIEW Cart
// POST   / => ADD to Cart
// PUT    / => EDIT item in Cart
// DELETE / => REMOVE item from Cart

// Cart - View all items in Cart
router.get('/', async (req, res, next) => {
  try {
    if (req.user) {
      const userCart = await Order.findOne({
        where: {
          userId: req.user.id,
          isPurchased: false
        }
      });
      const cartProducts = await buildCartProducts(userCart.id);
      res.json({userCart, orderProducts: cartProducts});
    } else {
      //sessions
      res.json(req.session.cart);
    }
  } catch (error) {
    next(error);
  }
});

// Cart - Add to cart
// eslint-disable-next-line max-statements
router.post('/', async (req, res, next) => {
  try {
    //IF NOT LOGGED IN:
    if (!req.user) {
      const cart = req.session.cart; // an empty obj
      const productId = +req.body.productId;
      const productQty = +req.body.productQty;
      const product = await Product.findByPk(productId);

      // Check inventory levels before adding to cart
      if (product.inventory >= productQty) {
        // Get cart
        //the cart either already lives on sessions
        //or it doesn't exist
        if (!cart.orderProducts.length) {
          // it does not exist, so create it.
          cart.orderProducts = [
            {
              id: product.id,
              name: product.name,
              slug: product.slug,
              imageUrl: product.imageUrl,
              price: product.price,
              quantity: productQty
            }
          ]; // an array of objs
        } else {
          //it does exist and we need to update it
          //loop through and see if you can find the same
          //productID

          let flag = 0;

          cart.orderProducts.forEach(orderProduct => {
            if (+orderProduct.id === +productId) {
              flag = 1;
            }
          });
          if (flag) {
            for (let i = 0; i < cart.orderProducts.length; i++) {
              if (+cart.orderProducts[i].id === +productId) {
                cart.orderProducts[i].quantity += +productQty;
                break;
              }
            }
          } else {
            cart.orderProducts.push({
              id: product.id,
              name: product.name,
              slug: product.slug,
              imageUrl: product.imageUrl,
              price: +product.price,
              quantity: +productQty
            });
          }
        }

        //ACCUMULATE GRAND TOTAL
        let grandTotal = 0;
        cart.orderProducts.forEach(orderProduct => {
          grandTotal += +orderProduct.price * +orderProduct.quantity;
        });
        //UPDATE ORDER GRANDTOTAL
        cart.grandTotal = grandTotal;
        res.json(req.session.cart);
      } else {
        //OTHERWISE WE'RE OUT OF THE PRODUCT
        throw new Error('Not enough product available.');
      }
    } else {
      //IF LOGGED IN:
      const productId = +req.body.productId;
      const productQty = +req.body.productQty;

      const product = await Product.findByPk(productId);

      const currentUser = req.user.id;

      // Check inventory levels before adding to cart
      if (product.inventory >= productQty) {
        // Get cart
        const userCart = await Order.findOne({
          where: {
            userId: currentUser,
            isPurchased: false
          },
          include: [{model: OrderProduct}]
        });

        //FIND OR CREATE ORDER PRODUCT
        await OrderProduct.findOrCreate({
          where: {orderId: userCart.id, productId},
          defaults: {
            orderId: userCart.id,
            productId,
            price: Number(product.price),
            quantity: Number(productQty)
          }
        }).spread(async function(orderProduct, created) {
          if (!created) {
            await orderProduct.update({
              quantity: Number(productQty) + orderProduct.quantity
            });
          }
        });

        //GET ALL ORDERPRODUCTS
        const allOrderProducts = await OrderProduct.findAll({
          where: {
            orderId: userCart.id
          }
        });

        //ACCUMULATE GRAND TOTAL
        let grandTotal = 0;
        allOrderProducts.forEach(orderProduct => {
          grandTotal += orderProduct.price * orderProduct.quantity;
        });

        //UPDATE ORDER GRANDTOTAL
        await userCart.update({
          grandTotal: grandTotal
        });

        const cartProducts = await buildCartProducts(userCart.id);

        res.json({userCart, orderProducts: cartProducts});
      } else {
        //OTHERWISE WE'RE OUT OF THE PRODUCT
        throw new Error('Not enough product available.');
      }
    }
  } catch (error) {
    next(error);
  }
});

// Cart - Edit Cart item
router.put('/', async (req, res, next) => {
  try {
    //IF NOT LOGGED IN:
    if (!req.user) {
      const cart = req.session.cart;
      const productId = +req.body.productId;
      const productQty = +req.body.productQty;
      const product = await Product.findByPk(productId);

      if (product.inventory >= productQty) {
        cart.orderProducts.forEach(orderProduct => {
          if (+orderProduct.id === +productId) {
            orderProduct.quantity = productQty;
          }
        });
        res.json(cart);
      } else {
        throw new Error('Not enough product available.');
      }
    } else {
      //IF LOGGED IN:
      const productId = req.body.productId;
      const productQty = req.body.productQty;
      const product = await Product.findByPk(productId);
      const currentUser = req.user.id;

      // Check inventory level for requested amount
      if (product.inventory >= productQty) {
        // Get Cart
        const userCart = await Order.findOne({
          where: {
            userId: currentUser,
            isPurchased: false
          },
          include: [{model: OrderProduct}]
        });

        userCart.orderProducts.map(item => {
          if (+item.productId === +productId) {
            item.quantity = +productQty;
            item.save();
          }
          return item;
        });

        const cartProducts = await buildCartProducts(userCart.id);

        res.json({userCart, orderProducts: cartProducts});
      } else {
        throw new Error('Not enough product available.');
      }
    }
  } catch (error) {
    next(error);
  }
});

// Cart - Delete Cart item
router.delete('/', async (req, res, next) => {
  try {
    const productId = +req.body.productId;
    if (!req.user) {
      const cart = req.session.cart;
      let flag = 0;
      let toSplice;
      cart.orderProducts.forEach((orderProduct, index) => {
        if (+orderProduct.id === +productId) {
          flag = 1;
          toSplice = index;
        }
        if (flag) {
          cart.orderProducts.splice(toSplice);
        }
      });
      //above deletes all only when clicked on the first.
      //deletes all nomatter where clicked
      // let newArr = cart.orderProducts.filter((orderProduct) => {
      //   if (!+orderProduct.id === +productId) return orderProduct
      // })
      // cart.orderProducts = newArr

      res.json(cart);
    } else {
      // Get cart
      const currentUser = req.user.id;
      const userCart = await Order.findOne({
        where: {
          userId: currentUser,
          isPurchased: false
        }
      });

      // Delete item from cart
      OrderProduct.destroy({
        where: {
          orderId: +userCart.id,
          productId
        }
      });

      const cartProducts = await buildCartProducts(userCart.id);

      res.json({userCart, orderProducts: cartProducts});
    }
  } catch (error) {
    next(error);
  }
});

// ======================
// Users - Order History

// Get a User's order history
router.get('/', async (req, res, next) => {
  try {
    const allOrders = await Order.findAll({
      where: {
        userId: req.user.id
      }
    });
    res.json(allOrders);
  } catch (error) {
    next(error);
  }
});

//CHECKOUT
router.post('/checkout', async (req, res, next) => {
  try {
    if (!req.user) {
      res.json({flag: true});
    } else {
      //CHECK IF IN STOCK
      const order = await Order.findOne({
        where: {
          userId: req.user.id,
          isPurchased: false
        }
      });
      const allProducts = await Product.findAll({});
      const allRespectiveOrderProducts = await OrderProduct.findAll({
        where: {
          orderId: order.id
        }
      });

      let allProductsWantedAvailable = true; //a flag
      const namesAndInventory = {}; //holds names and inventory
      allProducts.forEach(product => {
        namesAndInventory[product.name] = product.inventory; //gets entire arsenal
        allRespectiveOrderProducts.forEach(orderProduct => {
          if (product.id === orderProduct.productId) {
            if (orderProduct.quantity > product.inventory) {
              allProductsWantedAvailable = false;
            }
          }
        });
      });
      //IF ALL PRODUCTS WANTED ARE AVAILABLE
      if (allProductsWantedAvailable) {
        //NEED TO CHANGE INVENTORY OF PRODUCTS
        allProducts.forEach(product => {
          allRespectiveOrderProducts.forEach(orderProduct => {
            if (product.id === orderProduct.productId) {
              namesAndInventory[product.name] =
                namesAndInventory[product.name] - orderProduct.quantity;
            }
          });
        });

        allProducts.forEach(async product => {
          await product.update({
            inventory: namesAndInventory[product.name]
          });
        });

        //CHANGE ISPURCHASED STATUS
        await order.update({
          isPurchased: true
        });

        //Need a new order now with default properties
        await Order.create({userId: req.user.id});

        //redirect below to a checkout confirmation page
        res.sendStatus(202);
      } else {
        //BLOCK ORDER AND SEND ERROR

        for (let name in namesAndInventory) {
          if (namesAndInventory.hasOwnProperty(name)) {
            throw new Error(
              `\nthis product: ${name}, only has this much inventory: ${
                namesAndInventory[name]
              }`
            );
          }
        }
      }
    }
  } catch (error) {
    next(error);
  }
});

// Admins - Order Management

// View all Orders

// View a Single Order
// - Note: Not necessary for MVP

// Ship a Single Order
// - Note: Not necessary for MVP
router.get('/ship/:orderId', async (req, res, next) => {
  try {
    //req.user.id equivalent should be found on the frontend.
    const order = await Order.findByPk(req.params.orderId);
    if (order.isPurchased) {
      await order.update({
        isShipped: true
      });
      //redirect below to an admin shipping confirmation page
      res.sendStatus(200);
    } else res.sendStatus(400);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
