import React from 'react';
import CartContents from './CartContents';
import history from '../../../client/history';
import axios from 'axios';

export default class Cart extends React.Component {
  constructor() {
    super();
    this.state = {
      grandTotal: 0,
      cartSize: 0,
      cartError: ''
    };
    this.updateCartState = this.updateCartState.bind(this);
    this.handleCheckout = this.handleCheckout.bind(this);
    this.closeCart = this.closeCart.bind(this);
  }

  updateCartState(grandTotal, cartSize) {
    this.setState({grandTotal, cartSize, cartError: ''});
  }

  closeCart() {
    document
      .getElementById('cart-modal-mask')
      .style.setProperty('display', 'none', '');
  }

  async handleCheckout() {
    if (!this.state.cartSize) {
      this.setState({cartError: 'Add products to your cart to check out'});
    } else {
      this.setState({cartError: ''});
      try {
        let isGuest = await axios.post('/api/orders/checkout');
        if (isGuest.data.flag) {
          history.push('/login');
          this.closeCart();
        }
      } catch (error) {
        console.error(error);
      }
    }
  }

  render() {
    return (
      <div id="cart-modal-mask">
        <div id="cart-modal-container">
          <div id="cart-modal-main">
            <h1 className="cart-modal__title">Your Cart</h1>
            <div className="cart-grid">
              <div className="cart-grid__header">
                <div className="grid-item--one-half">&nbsp;</div>
                <div className="grid-item--one-fourth">Quantity</div>
                <div className="grid-item--one-fourth">Total</div>
              </div>
              <div className="cart-grid__body">
                <CartContents updateCartState={this.updateCartState} />
              </div>
            </div>
            <br />
            <div className="cart-modal-footer">
              {this.state.cartError && (
                <p className="error-msg">{this.state.cartError}</p>
              )}
              <div className="cart-modal__grand-total">
                Grand Total: ${(this.state.grandTotal / 100).toFixed(2)}
              </div>
              <button
                type="submit"
                name="completeCheckout"
                className="btn btn--checkout cart-checkout"
                onClick={this.handleCheckout}
              >
                Place Order
              </button>
            </div>
            <a
              href="#"
              style={{position: 'absolute', top: '-10px', right: '-10px'}}
              onClick={this.closeCart}
            >
              <i
                style={{
                  fontSize: '1.6em',
                  backgroundColor: 'white',
                  color: 'black',
                  borderRadius: '1.6em'
                }}
                className="fas fa-times-circle"
              />
            </a>
          </div>
        </div>
      </div>
    );
  }
}
