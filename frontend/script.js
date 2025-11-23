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

        const returnProba = document.getElementById("returnProba").checked;

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

        // Reveal results section
        resultsSection.style.display = "block";

        // Extract probabilities
        let probaList = [
            data.probabilities["0"] ?? 0,
            data.probabilities["1"] ?? 0,
            data.probabilities["2"] ?? 0
        ];

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
                scales: { y: { beginAtZero: true, max: 1 } }
            }
        });

        // ---------------------------------------
        // DIAGNOSIS SUMMARY CARD (INSIDE CLICK)
        // ---------------------------------------

        const outcomeMap = {
            0: "RIF (Recurrent Implantation Failure)",
            1: "RPL (Recurrent Pregnancy Loss)",
            2: "Combined RIF/RPL Risk"
        };

        const notesMap = {
            0: "RIF prediction suggests possible impaired implantation. Consider evaluating uterine environment, immune activity, and prior cycle performance.",
            1: "RPL prediction may indicate systemic immunological imbalance or hormonal insufficiency. Early monitoring and immunomodulatory protocols may be beneficial.",
            2: "Combined risk indicates multiple contributing factors. A multidisciplinary approach, including immunology and endocrinology, is recommended."
        };

        const predicted = data.predicted_class;
        const confidence = (data.confidence * 100).toFixed(1) + "%";

        document.getElementById("diagOutcome").textContent = outcomeMap[predicted];
        document.getElementById("diagConfidence").textContent = confidence;
        document.getElementById("diagNotes").textContent = notesMap[predicted];

        document.getElementById("diagnosisCard").style.display = "block";

    }); // <-- END CLICK HANDLER

}); // <-- END DOMContentLoaded
