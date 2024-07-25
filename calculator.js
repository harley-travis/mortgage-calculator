var housePrice = $("input[name=house-price]");
var interestRate = $("input[name=interest-rate]");
var downPayment = $("input[name=down-payment]");
var insurance = $("input[name=insurance]");
var taxes = $("input[name=taxes]");
var loanType = $("select[name=loan-type]");
var years;

var breakdownChart;

var validateAndCalculate = function() {
    if (validateInputs()) {
        calculate();
    }
    updateDownPaymentDollar();
};

housePrice.on("input", validateAndCalculate);
interestRate.on("input", validateAndCalculate);
downPayment.on("input", validateAndCalculate);
insurance.on("input", validateAndCalculate);
taxes.on("input", validateAndCalculate);
loanType.on("change", validateAndCalculate);
$("input:radio[name=years-radio]").on("change", function() {
    years = $("input:radio[name=years-radio]:checked");
    validateAndCalculate();
});

$("input[data-type='currency']").on({
    keyup: function() {
        formatCurrency($(this));
    },
    blur: function() { 
        formatCurrency($(this), "blur");
    }
});


function validateInputs() {
    var housePriceValid = housePrice.val() && parseFloat(housePrice.val().replace(/[^0-9.-]+/g, "")) > 0;
    var interestRateValid = interestRate.val() && parseFloat(interestRate.val()) > 0 && parseFloat(interestRate.val()) < 100;
    var yearsValid = $("input:radio[name=years-radio]:checked").val() !== undefined;
    var downPaymentValid = downPayment.val() && parseFloat(downPayment.val()) >= 0 && parseFloat(downPayment.val()) < 100;
    var insuranceValid = insurance.val() && parseFloat(insurance.val().replace(/[^0-9.-]+/g, "")) > 0;
    var taxesValid = taxes.val() && parseFloat(taxes.val().replace(/[^0-9.-]+/g, "")) > 0;

    return housePriceValid && interestRateValid && yearsValid && downPaymentValid && insuranceValid && taxesValid;
}

function updateDownPaymentDollar() {
    var housePriceValue = parseFloat(housePrice.val().replace(/[^0-9.-]+/g, ""));
    var downPaymentPercent = parseFloat(downPayment.val());
    if (!isNaN(housePriceValue) && !isNaN(downPaymentPercent)) {
        var downPaymentDollar = housePriceValue * downPaymentPercent / 100;
        var formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
        $('.down-payment-dollar').text(formatter.format(downPaymentDollar));
    } else {
        $('.down-payment-dollar').text('');
    }
}

function calculate() {
    function getTotal(principal, payment) {
        return ((((principal * interestRateM) / (1 - Math.pow(1 + interestRateM, (-1 * months))) * 100) / 100) + insuranceMonthly + taxesMonthly + payment);
    }

    var numYears = parseInt(years.val());
    var housePriceValue = parseFloat(housePrice.val().replace(/[^0-9.-]+/g, ""));
    var downPaymentPercent = parseFloat(downPayment.val());
    var downPaymentDollar = housePriceValue * downPaymentPercent / 100;
    var principal = housePriceValue - downPaymentDollar;
    var interestRateM = interestRate.val() / (100 * 12);
    var months = numYears * 12;
    var insuranceMonthly = parseFloat(insurance.val().replace(/[^0-9.-]+/g, "")) / 12;
    var taxesMonthly = parseFloat(taxes.val().replace(/[^0-9.-]+/g, "")) / 12;

    var selectedLoanType = loanType.val();
    var totalPayment, principalAndInterest, pmi = 0;

    if (selectedLoanType === "FHA") {
        var fhaPrincipal = principal + (principal * 0.0175);
        var fhaPayment;
        if (numYears === 15) {
            fhaPayment = (downPaymentPercent >= 10) ? ((fhaPrincipal * 0.0025) / 12) : ((fhaPrincipal * 0.0050) / 12);
        } else if(numYears === 30) {
            fhaPayment = (downPaymentPercent >= 5) ? ((fhaPrincipal * 0.0050) / 12) : ((fhaPrincipal * 0.0085) / 12);
        }
        principalAndInterest = (((fhaPrincipal * interestRateM) / (1 - Math.pow(1 + interestRateM, (-1 * months))) * 100) / 100);
        totalPayment = principalAndInterest + insuranceMonthly + taxesMonthly + fhaPayment;
    } else if (selectedLoanType === "USDA") {
        var usdaPrincipal = principal + (principal * 0.02);
        var usdaPayment = ((usdaPrincipal * 0.0035) / 12);
        principalAndInterest = (((usdaPrincipal * interestRateM) / (1 - Math.pow(1 + interestRateM, (-1 * months))) * 100) / 100);
        totalPayment = principalAndInterest + insuranceMonthly + taxesMonthly + usdaPayment;
    } else if (selectedLoanType === "VA") {
        var vaPrincipal = principal + (principal * 0.023);
        var vaPayment = ((vaPrincipal * 0.005) / 12);
        principalAndInterest = (((vaPrincipal * interestRateM) / (1 - Math.pow(1 + interestRateM, (-1 * months))) * 100) / 100);
        totalPayment = principalAndInterest + insuranceMonthly + taxesMonthly + vaPayment;
    } else {
        // Conventional loan with PMI logic
        principalAndInterest = (((principal * interestRateM) / (1 - Math.pow(1 + interestRateM, (-1 * months))) * 100) / 100);
        if (downPaymentPercent < 20) {
            pmi = (principal * 0.005) / 12; // Assuming PMI is 0.5% annually of the loan amount
        }
        totalPayment = principalAndInterest + insuranceMonthly + taxesMonthly + pmi;
    }

    var formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    $('.total-output').text('Monthly Payment: ' + formatter.format(totalPayment));
    $('.total-output').data('principal-and-interest', formatter.format(principalAndInterest));
    $('.total-output').data('insurance-monthly', formatter.format(insuranceMonthly));
    $('.total-output').data('taxes-monthly', formatter.format(taxesMonthly));
    $('.total-output').data('pmi', formatter.format(pmi));

    updateChart(principalAndInterest, insuranceMonthly, taxesMonthly, pmi);

}

function formatCurrency(input, blur) {
    var input_val = input.val();
    if (input_val === "") { return; }
    var original_len = input_val.length;
    var caret_pos = input.prop("selectionStart");
    if (input_val.indexOf(".") >= 0) {
        var decimal_pos = input_val.indexOf(".");
        var left_side = input_val.substring(0, decimal_pos);
        var right_side = input_val.substring(decimal_pos);
        left_side = formatNumber(left_side);
        right_side = formatNumber(right_side);
        if (blur === "blur") {
            right_side += "00";
        }
        right_side = right_side.substring(0, 2);
        input_val = "$" + left_side + "." + right_side;
    } else {
        input_val = formatNumber(input_val);
        input_val = "$" + input_val;
        if (blur === "blur") {
            input_val += ".00";
        }
    }
    input.val(input_val);
    var updated_len = input_val.length;
    caret_pos = updated_len - original_len + caret_pos;
    input[0].setSelectionRange(caret_pos, caret_pos);
}

function formatNumber(n) {
    return n.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

$('.total-output').hover(function() {
    var principalAndInterest = $(this).data('principal-and-interest');
    var insuranceMonthly = $(this).data('insurance-monthly');
    var taxesMonthly = $(this).data('taxes-monthly');
    var pmi = $(this).data('pmi');

    var tooltipContent = "<b>Principal and Interest:</b> " + principalAndInterest + "<br>" +
                         "<b>Insurance:</b> " + insuranceMonthly + "<br>" +
                         "<b>Taxes:</b> " + taxesMonthly + "<br>" +
                         "<b>PMI:</b> " + pmi;

    $(this).attr('data-original-title', tooltipContent).tooltip('show');
}, function() {
    $(this).tooltip('hide');
});

function updateChart(principalAndInterest, insurance, taxes, pmi) {
    var ctx = document.getElementById('breakdown-chart').getContext('2d');
    if (breakdownChart) {
        breakdownChart.destroy();
    }
    breakdownChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Principal & Interest', 'Insurance', 'Taxes', 'PMI'],
            datasets: [{
                data: [principalAndInterest, insurance, taxes, pmi],
                backgroundColor: ['#37503d', '#3F734B', '#3C9D53'],
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            var label = context.label || '';
                            var value = context.raw || 0;
                            return label + ': ' + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
                        }
                    }
                }
            }
        }
    });
}
