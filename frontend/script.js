document.addEventListener("DOMContentLoaded", () => {

    const predictBtn = document.getElementById("predictBtn");
    const resultsSection = document.getElementById("resultsSection");
    const responseJson = document.getElementById("responseJson");

    let chartInstance = null;

    predictBtn.addEventListener("click", async () => {

        // Build the feature list in correct order
        const features = [
            parseFloat(document.getElementById("f_adenomyosis").value),
            parseFloat(document.getElementById("f_endometriosis").value),
            parseFloat(document.getElementById("f_fibroids").value),
            parseFloat(document.getElementById("f_ga").value),
            parseFloat(document.getElementById("f_pcos").value),
            parseFloat(document.getElementById("f_th17").value),
            parseFloat(document.getElementById("f_th17_ifn_pos").value),
            parseFloat(document.getElementById("f_th17_ifn_neg").value),
            parseFloat(document.getElementById("f_treg_ratio").value)
        ];

        // Read return_proba checkbox
        const returnProba = document.getElementById("returnProba").checked;

        // Prepare request body
        const body = {
            features: features,
            return_proba: returnProba
        };

        // Call backend
        let response = await fetch("http://127.0.0.1:8000/predict", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(body)
        });

        const data = await response.json();

        console.log("Backend returned:", data);
        responseJson.textContent = JSON.stringify(data, null, 2);

        // Show results section
        resultsSection.style.display = "block";

        // Extract probabilities into list for Chart.js
        let probaList = [0, 0, 0];
        if (data.probabilities) {
            probaList = [
                data.probabilities["0"] ?? 0,
                data.probabilities["1"] ?? 0,
                data.probabilities["2"] ?? 0
            ];
        }

        // Draw chart
        const ctx = document.getElementById("probaChart");
        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["RIF (0)", "RPL (1)", "Both (2)"],
                datasets: [{
                    label: "Probability",
                    data: probaList,
                    backgroundColor: ["#6D0E1E", "#A83244", "#D96A70"]
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1
                    }
                }
            }
        });
    });

});
