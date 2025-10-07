function saveData() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;
  console.log("Saved Data:", { name, email, phone });

  // Optionally, add logic to save data to a server or localStorage.
}