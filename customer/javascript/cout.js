// LALAMOVE TO MGA TANGA
const backendURL = window.location.origin; // Use same domain as frontend

document.getElementById("checkoutForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const customer = {
    name: document.getElementById("name").value,
    phone: document.getElementById("phone").value,
    address: document.getElementById("address").value
  };

  // Step 1: Get quotation
  const pickup = { lat: 14.5995, lng: 120.9842, address: "Restaurant Manila" };
  const dropoff = { lat: 14.6091, lng: 121.0223, address: customer.address };

  try {
    const quoteRes = await fetch(`${backendURL}/api/quotation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickup, dropoff })
    });
    const quotation = await quoteRes.json();
    console.log("Quotation:", quotation);

    // Step 2: Place order
    const orderRes = await fetch(`${backendURL}/api/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quotation, customer })
    });
    const order = await orderRes.json();
    console.log("Order:", order);

    document.getElementById("output").innerText =
      "Order placed!\n\nQuotation:\n" + JSON.stringify(quotation, null, 2) +
      "\n\nOrder:\n" + JSON.stringify(order, null, 2);

  } catch (err) {
    console.error(err);
    document.getElementById("output").innerText = "Error: " + err.message;
  }
});
