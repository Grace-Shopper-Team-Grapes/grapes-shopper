import React from 'react';
const AddToCartForm = props => {
  return (
    <form id="addToCartForm" onSubmit={props.handleSubmit}>
      <label htmlFor="quantity">Quantity: </label>
      <input
        type="text"
        name="quantity"
        onChange={props.handleChange}
        placeholder="1"
        value={props.quantity || ''} // this condition fixes a warning
      />

      <button type="submit">Submit</button>
    </form>
  );
};

export default AddToCartForm;
