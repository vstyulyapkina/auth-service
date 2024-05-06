let scalesFromOntology = {};
let qualitativeScaleOptions = "";
let qualitativeScaleValues = {};
let criteriaScales = {};
let quantitativeLimitsOptions = "";
let formattedQuantitativeLimitsOptions = "";
let criteriaLimits = {};
let limits = [];
let numExperts = 0;
let numCriteria = 0;
let alternatives = [];
let criteria = [];

function loadScalesFromOntology() {
    return new Promise((resolve, reject) => {
        $.getJSON('/load-scales', function (data) {
            scalesFromOntology = data;
            qualitativeScaleOptions = "";
            qualitativeScaleValues = {};
            let index = 0;
            for (let key in scalesFromOntology) {
                index++;
                qualitativeScaleOptions += `<option value="S${index}">S${index} (${key})</option>`;
                qualitativeScaleValues[`S${index}`] = scalesFromOntology[key].join(", ");
            }
            console.log(qualitativeScaleValues);
            $("#scales-content").html(Object.entries(scalesFromOntology).map(([key, values], i) =>
`<div><strong>S${i+1} (${key}):</strong> ${values.join(", ")}</div>`).join(''));
            resolve();
        }).fail(function (jqXHR, textStatus, errorThrown) {
            console.error("Error loading scales from ontology: ", textStatus, errorThrown);
            reject(textStatus);
        });
    });
}

function loadQuantitativeScales() {
    return new Promise((resolve, reject) => {
        $.getJSON('/load-quantitative-scales', function (data) {
            console.log("Loaded quantitative scales: ", data);
            quantitativeLimitsOptions = Object.entries(data).map(([key, {
                                min,
                                max
                            }
                        ], i) =>
`<option value="${key}">R${i+1} (${key}): Minimum: ${min}, Maximum: ${max}</option>`).join('');
            formattedQuantitativeLimitsOptions = Object.entries(data).map(([key, {
                                min,
                                max
                            }
                        ], i) => {
                    criteriaLimits[key] = max;
                    return `<div><strong>R${i+1} (${key})</strong>: Minimum: ${min}, Maximum: ${max}</div>`;
                }).join('');
            console.log("Criteria Limits after loading: ", criteriaLimits);
            $("#quantitative-limits-content").html(formattedQuantitativeLimitsOptions);
            resolve();
        }).fail(function (jqXHR, textStatus, errorThrown) {
            console.error("Error loading quantitative scales: ", textStatus, errorThrown);
            reject(textStatus);
        });
    });
}

function getSelectedCriteriaLimits() {
    return new Promise((resolve, reject) => {
        let selectedLimits = [];
        $('.criteria-block').each(function () {
            let limitSelect = $(this).find('select[id^="criteria-"][id$="-limit-select"]');
            let selectedLimit = limitSelect.find('option:selected').text();
            let key = selectedLimit.match(/\(([^)]+)\)/)[1];
            let maxLimit = criteriaLimits[key];
            selectedLimits.push(maxLimit);
        });
        resolve(selectedLimits);
    });
}

function renderExpertInputFields(numExperts) {
    let expertFields = "";
    for (let i = 1; i <= numExperts; i++) {
        expertFields += `<div class="expert-block"><span class="bold-text">Эксперт ${i}:</span><br>`;
        expertFields += `<label for="expert-${i}-name">Имя:</label> <input type="text" id="expert-${i}-name" name="expert-${i}-name" required><br>`;
        expertFields += `<label for="expert-${i}-id">ID:</label> <input type="text" id="expert-${i}-id" name="expert-${i}-id" required><br>`;
        expertFields += `<label for="expert-${i}-competence">Компетенция:</label> <input type="text" id="expert-${i}-competence" name="expert-${i}-competence" required><br></div>`;
    }
    $("#experts-fields").html(expertFields);
}

function saveDataToJsonFile() {
    console.log("Saving data to JSON file...");
    console.log("Current scales from ontology: ", scalesFromOntology);
    let data = {
        "task_description": {
            "abstractionLevels": [{
                    "abstractionLevelID": "group1",
                    "abstractionLevelName": "Abstraction level no. 1"
                }
            ],
            "abstractionLevelWeights": {
                "group1": 1.0
            },
            "scales": [],
            "criteria": {
                "group1": []
            },
            "alternatives": [],
            "expertWeightsRule": {
                "1": 1.0
            },
            "expertWeights": {},
            "experts": [],
            "estimations": {}
        }
    };
    let scaleIDData = {};
    let totalExpertWeight = 0;
    let index = 1;

    for (let i = 1; i <= numExperts; i++) {
        let expertName = $("#expert-" + i + "-name").val();
        let expertID = $("#expert-" + i + "-id").val();
        let competencies = $("#expert-" + i + "-competence").val().split(", ");
        let weight = Number((Math.random()).toFixed(1));
        totalExpertWeight += weight;
        data.task_description.experts.push({
            expertName: expertName,
            expertID: expertID,
            competencies: competencies
        });
        data.task_description.estimations[expertID] = [];
        data.task_description.expertWeights[expertID] = weight;
    }

    let correctionFactor = 1 / totalExpertWeight;

    for (let i = 1; i <= numExperts; i++) {
        let expertID = $("#expert-" + i + "-id").val();
        data.task_description.expertWeights[expertID] *= correctionFactor;
        data.task_description.expertWeights[expertID] = Number(data.task_description.expertWeights[expertID].toFixed(1));
    }

    for (let i = 1; i <= numCriteria; i++) {
        let criteriaID = $("#criteria-" + i + "-id").val();
        let criteriaName = $("#criteria-" + i + "-name").val();
        let isQualitative = $("#criteria-" + i + "-qualitative").val() === 'true';

        data.task_description.criteria.group1.push({
            criteriaID: criteriaID,
            criteriaName: criteriaName,
            qualitative: isQualitative
        });
    }

    for (let key in scalesFromOntology) {
        data.task_description.scales.push({
            scaleID: "S" + index,
            scaleName: key,
            labels: scalesFromOntology[key]
        });
        index++;
    }

    for (let i = 1; i <= alternatives.length; i++) {
        data.task_description.alternatives.push({
            alternativeID: $("#alternative-id-" + i).val(),
            alternativeName: $("#alternative-name-" + i).val(),
            abstractionLevelID: "group1"
        });
    }

    for (let i = 1; i <= numExperts; i++) {
        let expertID = $("#expert-" + i + "-id").val();
        for (let j = 0; j < alternatives.length; j++) {
            let alternativeID = $("#alternative-id-" + (j + 1)).val();
            let criteria2Estimation = [];
            for (let k = 0; k < criteria.length; k++) {
                let criteriaID = $("#criteria-" + (k + 1) + "-id").val();
                let estimationData = {
                    criteriaID: criteriaID,
                    estimation: [$("#assessment-" + i + "-" + (j + 1) + "-" + (k + 1)).val()]
                };
                let isQualitative = $("#criteria-" + (k + 1) + "-qualitative").val() === 'true';
                if (isQualitative) {
                    let selectedScale = $(`#criteria-${k+1}-scale-select`).val();
                    if (selectedScale) {
                        estimationData['scaleID'] = selectedScale;
                    }
                }
                criteria2Estimation.push(estimationData);
            }
            data.task_description.estimations[expertID].push({
                alternativeID: alternativeID,
                criteria2Estimation: criteria2Estimation
            });
        }
    }

    let jsonString = JSON.stringify(data, null, 2);
    console.log("Generated JSON: ", jsonString);
    let blob = new Blob([jsonString], {
        type: "application/json"
    });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "data.json";
    link.click();

    return jsonString;
}

function sendJsonDataToServer(jsonData) {
    $.ajax({
        type: "POST",
        url: "/send-json",
        dataType: "json",
        data: jsonData,
        success: function (response) {
            console.log(response);
            let resultText = JSON.stringify(response, null, 2);
            $("#result-text").html(resultText);
            $("#assessment-modal").modal("hide");
            $("#result-modal").modal("show");
        },
        error: function (error) {
            console.log(error);
        },
    });
}

$("#next-experts-btn").click(function () {
    let allFieldsFilled = true;
    let warningMessage1 = "";

    for (let i = 1; i <= numExperts; i++) {
        if ($("#expert-" + i + "-name").val() === "" || $("#expert-" + i + "-id").val() === "" || $("#expert-" + i + "-competence").val() === "") {
            allFieldsFilled = false;
            $("#expert-" + i + "-name").css("border", "2px solid red");
            $("#expert-" + i + "-id").css("border", "2px solid red");
            $("#expert-" + i + "-competence").css("border", "2px solid red");
            warningMessage1 += "Пожалуйста, заполните поля Эксперта " + i + ".<br>";
        } else {
            $("#expert-" + i + "-name").css("border", "");
            $("#expert-" + i + "-id").css("border", "");
            $("#expert-" + i + "-competence").css("border", "");
        }
    }
    if (allFieldsFilled) {
        loadScalesFromOntology().then(() => {
            $("#experts-modal").modal("hide");
            $("#qualitative-scales-modal").modal();
        });
    } else {
        $("#warning-message1").html(warningMessage1);
        $("#warning-message1").show();
    }
});

$("#next-criteria-count-btn").click(function () {
    numCriteria = parseInt($("#criteria-count-input").val());
    if (numCriteria > 0 && numCriteria <= 50) {
        loadQuantitativeScales().then(() => {
            $("#criteria-count-modal").modal("hide");
            $("#criteria-modal").modal();

            let criteriaFields = "";
            for (let i = 1; i <= numCriteria; i++) {
                criteriaFields += `<div class="criteria-block">`;
                criteriaFields += `<div><strong>Критерий ${i}:</strong></div>`;
                criteriaFields += `<label for="criteria-${i}-id">ID:</label> <input type="text" id="criteria-${i}-id" name="criteria-${i}-id" required><br>`;
                criteriaFields += `<label for="criteria-${i}-name">Имя:</label> <input type="text" id="criteria-${i}-name" name="criteria-${i}-name" required><br>`;
                criteriaFields += `<label for="criteria-${i}-qualitative">Качественный критерий:</label> <select id="criteria-${i}-qualitative" name="criteria-${i}-qualitative"><option value="false">false</option><option value="true">true</option></select><br>`;
                criteriaFields += `<div id="criteria-${i}-scale" style="display: none;"><label for="criteria-${i}-scale-select">Выберите шкалу:</label> <select id="criteria-${i}-scale-select" name="criteria-${i}-scale-select"></select><br></div>`;
                criteriaFields += `<div id="criteria-${i}-limit"><label for="criteria-${i}-limit-select">Ограничение:</label> <select id="criteria-${i}-limit-select" name="criteria-${i}-limit-select">${quantitativeLimitsOptions}</select><br></div>`;
                criteriaFields += `</div>`;
            }
            $("#criteria-fields").html(criteriaFields);

            for (let i = 1; i <= numCriteria; i++) {
                $(`#criteria-${i}-qualitative`).change(function () {
                    if ($(this).val() === "true") {
                        $(`#criteria-${i}-scale`).show();
                        $(`#criteria-${i}-limit`).hide();
                        $(`#criteria-${i}-scale-select`).html(qualitativeScaleOptions);
                    } else {
                        $(`#criteria-${i}-scale`).hide();
                        $(`#criteria-${i}-limit`).show();
                        $(`#criteria-${i}-limit-select`).html(quantitativeLimitsOptions);
                    }
                });
                if ($(`#criteria-${i}-qualitative`).val() === "false") {
                    $(`#criteria-${i}-scale`).hide();
                    $(`#criteria-${i}-limit`).show();
                } else {
                    $(`#criteria-${i}-scale`).show();
                    $(`#criteria-${i}-limit`).hide();
                    $(`#criteria-${i}-scale-select`).html(qualitativeScaleOptions);
                }
            }
        }).catch(error => {
            console.error("Error loading quantitative scales: ", error);
        });
    }
});

$("#next-criteria-btn").click(function () {
    let allFieldsFilled = true;
    let warningMessage = "";

    let limits = getSelectedCriteriaLimits();
    console.log(limits);

    for (let i = 1; i <= numCriteria; i++) {
        if ($("#criteria-" + i + "-id").val() === "" || $("#criteria-" + i + "-name").val() === "") {
            allFieldsFilled = false;
            $("#criteria-" + i + "-id").css("border", "2px solid red");
            $("#criteria-" + i + "-name").css("border", "2px solid red");
            warningMessage += "Пожалуйста, заполните поля Критерия " + i + ".<br>";
        } else {
            $("#criteria-" + i + "-id").css("border", "");
            $("#criteria-" + i + "-name").css("border", "");
        }
    }

    if (allFieldsFilled) {
        let numCriteria = parseInt($("#criteria-count-input").val());
        criteria = [];

        for (let i = 1; i <= numCriteria; i++) {
            criteria.push($(`#criteria-${i}-name`).val());
        }
        $("#criteria-modal").modal("hide");
        $("#alternatives-count-modal").modal();
    } else {
        $("#warning-message").html(warningMessage);
        $("#warning-message").show();
    }
});

$("#next-alternatives-count-btn").click(function () {
    let alternativesCount = parseInt($("#alternatives-count-input").val());
    if (alternativesCount > 0 && alternativesCount <= 50) {
        $("#alternatives-count-modal").modal("hide");
        $("#alternatives-modal").modal();

        let alternativesFields = "";
        for (let i = 1; i <= alternativesCount; i++) {
            alternativesFields += `<div class="alternative-block">`;
            alternativesFields += `<div><strong>Альтернатива ${i}:</strong></div>`;
            alternativesFields += `<label for="alternative-id-${i}">ID:</label> <input type="text" id="alternative-id-${i}" name="alternative-id-${i}" required><br>`;
            alternativesFields += `<label for="alternative-name-${i}">Имя:</label> <input type="text" id="alternative-name-${i}" name="alternative-name-${i}" required><br>`;
            alternativesFields += `</div>`;
        }
        $("#alternatives-fields").html(alternativesFields);
    }
});

$('#next-scales-btn').click(function () {
    $('#qualitative-scales-modal').modal('hide');
    loadQuantitativeScales().then(() => {
        $('#quantitative-limits-modal').modal('show');
    }).catch(error => {
        console.error("Failed to load quantitative scales: ", error);
    });
});

$('#next-limits-btn').click(function () {
    $('#quantitative-limits-modal').modal('hide');
    $('#criteria-count-modal').modal('show');
});

$("#next-alternatives-btn").click(function () {
    let allFieldsFilled = true;
    let warningMessage2 = "";
    let alternativesCount = parseInt($("#alternatives-count-input").val());

    for (let i = 1; i <= alternativesCount; i++) {
        if ($("#alternative-id-" + i).val() === "" || $("#alternative-name-" + i).val() === "") {
            allFieldsFilled = false;
            $("#alternative-id-" + i).css("border", "2px solid red");
            $("#alternative-name-" + i).css("border", "2px solid red");
            warningMessage2 += "Пожалуйста, заполните поля Альтернативы " + i + ".<br>";
        } else {
            $("#alternative-id-" + i).css("border", "");
            $("#alternative-name-" + i).css("border", "");
        }
    }

    if (allFieldsFilled) {
        getSelectedCriteriaLimits().then(limits => {
            let numAlternatives = parseInt($("#alternatives-count-input").val());
            alternatives = [];

            for (let i = 1; i <= numAlternatives; i++) {
                alternatives.push($(`#alternative-name-${i}`).val());
            }

            let assessmentFields = "";
            for (let i = 1; i <= numExperts; i++) {
                assessmentFields += `<h3>Эксперт ${i}</h3>`;
                for (let j = 0; j < alternatives.length; j++) {
                    assessmentFields += `<div><strong>${alternatives[j]}:</strong></div>`;
                    for (let k = 0; k < criteria.length; k++) {
                        let isQualitative = $("#criteria-" + (k + 1) + "-qualitative").val() === "true";
                        let scaleIndex = $("#criteria-" + (k + 1) + "-scale-select").val();
                        if (isQualitative) {

                            assessmentFields += `<div><span>${criteria[k]}:</span> <select id="assessment-${i}-${j+1}-${k+1}" name="assessment-${i}-${j+1}-${k+1}">`;
                            let selectedScale = $(`#criteria-${k+1}-scale-select`).val();
                            if (selectedScale && selectedScale.startsWith('S')) {
                                let scaleIndex = parseInt(selectedScale.substring(1));
                                let scaleValues = qualitativeScaleValues[selectedScale];

                                if (scaleValues) {
                                    scaleValues.split(', ').forEach(value => {
                                        assessmentFields += `<option value="${value.trim()}">${value.trim()}</option>`;
                                    });
                                }
                            }
                            assessmentFields += `</select></div>`;
                        } else {
                            let maxLimit = limits[k];
                            console.log("Max Limit for", criteria[k], "is", maxLimit);
                            assessmentFields += `<div><span>${criteria[k]}:</span> <input type="number" value="0" id="assessment-${i}-${j+1}-${k+1}" name="assessment-${i}-${j+1}-${k+1}" max="${maxLimit}"></div>`;
                        }
                    }
                }
            }
            $("#assessment-fields").html(assessmentFields);
            $("#alternatives-modal").hide();
            $("#assessment-modal").modal();
        }).catch(error => {
            console.error("Error getting limits: ", error);
            alert("Failed to retrieve limits.");
        });
    } else {
        $("#warning-message2").html(warningMessage2);
        $("#warning-message2").show();
    }
});

$(document).on('change', '.criteria-qualitative-select', function () {
    let criteriaIndex = $(this).data('index');
    let scaleSelect = $(`#criteria-${criteriaIndex}-scale-select`);
    let limitsSelect = $(`#criteria-${criteriaIndex}-limit-select`);
    if ($(this).val() === "true") {
        scaleSelect.html(qualitativeScaleOptions);
        $(`#criteria-${criteriaIndex}-scale`).show();
        $(`#criteria-${criteriaIndex}-limit`).hide();
    } else {
        $(`#criteria-${criteriaIndex}-scale`).hide();
        limitsSelect.html('');
        $(`#criteria-${criteriaIndex}-limit`).show();
    }
});

$(document).ready(function () {
    $("#main-modal").modal();
    $("#submit-btn").click(function () {
        numExperts = parseInt($("#experts-input").val());
        if (numExperts > 0 && numExperts <= 50) {
            $("#main-modal").hide();
            $("#experts-modal").modal();
            loadScalesFromOntology().then(() => {
                renderExpertInputFields(numExperts);
                getSelectedCriteriaLimits().then(obtainedLimits => {
                    limits = obtainedLimits;
                });
            })
            let expertFields = "";
            for (let i = 1; i <= numExperts; i++) {
                expertFields += `<div class="expert-block"><span class="bold-text">Эксперт ${i}:</span><br>`;
                expertFields += `<label for="expert-${i}-name">Имя:</label> <input type="text" id="expert-${i}-name" name="expert-${i}-name" required><br>`;
                expertFields += `<label for="expert-${i}-id">ID:</label> <input type="text" id="expert-${i}-id" name="expert-${i}-id" required><br>`;
                expertFields += `<label for="expert-${i}-competence">Компетенция:</label> <input type="text" id="expert-${i}-competence" name="expert-${i}-competence" required><br></div>`;
            }
            $("#experts-fields").html(expertFields);
        }
    });

    $(document).on('click', '#save-data-btn', function () {
        let jsonData = saveDataToJsonFile();
        if (jsonData) {
            setTimeout(function () {
                sendJsonDataToServer(jsonData);
            }, 2000);
        }
    });

    $("#restart-btn").click(function () {
        numExperts = 0;
        numCriteria = 0;
        alternatives = [];
        criteria = [];
        $("input[type=text]").val('');
        $("input[type=number]").val('');
        $("#result-text").html('');
        $("#result-modal").modal("hide");
        $("#main-modal").modal();
    });
});
