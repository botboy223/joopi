document.addEventListener("DOMContentLoaded", () => {
    fetch("https://api64.ipify.org?format=json")
        .then(response => response.json())
        .then(data => {
            const userIP = data.ip;
            fetch("user.json")
                .then(response => response.json())
                .then(authData => {
                    if (authData.authorized_ips.includes(userIP)) {
                        window.location.href = "web.html";
                    } else {
                        document.getElementById("auth-container").innerHTML = `
                            <h2>Request Access</h2>
                            <form id="auth-form">
                                <input type="text" id="user-id" placeholder="User ID" required>
                                <input type="password" id="password" placeholder="Password" required>
                                <input type="text" id="ip" value="${userIP}" readonly>
                                <button type="submit">Request Access</button>
                            </form>
                            <p id="message"></p>
                        `;
                        document.getElementById("auth-form").addEventListener("submit", function(e) {
                            e.preventDefault();
                            document.getElementById("message").textContent = "Waiting for authentication...";
                        });
                    }
                });
        });
});
