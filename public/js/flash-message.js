document.addEventListener("DOMContentLoaded", function () {
  const flashMessages = document.querySelectorAll(".flash-message");

  flashMessages.forEach((message) => {
    if (message.innerText.trim().length > 0) {
      // Show the message
      message.style.display = "block";

      // Hide after 3 seconds
      setTimeout(() => {
        message.style.transition = "opacity 0.5s ease";
        message.style.opacity = "0";
        setTimeout(() => (message.style.display = "none"), 500); // Fully hide after fade out
      }, 3000);
    }
  });
});
