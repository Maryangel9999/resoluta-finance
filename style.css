
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const byId = (id) => document.getElementById(id);

  const form = byId("pricingForm");
  const menuToggle = byId("menuToggle");
  const navigation = byId("navigation");
  const formMessage = byId("formMessage");
  const saveMessage = byId("saveMessage");
  const downloadButton = byId("downloadCsv");
  const saveButton = byId("saveCalculation");

  let lastCalculation = null;

  const currency = (value) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number.isFinite(value) ? value : 0);

  const numberFormat = (value) =>
    new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(value);

  const readNumber = (id) => {
    const element = byId(id);
    if (!element || element.value.trim() === "") return null;

    const value = Number(element.value);
    return Number.isFinite(value) ? value : null;
  };

  function setText(id, value) {
    const element = byId(id);
    if (element) element.textContent = value;
  }

  function validateInputs() {
    const unitCost = readNumber("unitCost");
    const variableExpenses = readNumber("variableExpenses");
    const profitMargin = readNumber("profitMargin");
    const quantity = readNumber("quantity");
    const fixedExpenses = readNumber("fixedExpenses");
    const desiredPrice = readNumber("desiredPrice");

    if (unitCost === null || unitCost < 0) {
      return "Informe um custo unitário válido, igual ou superior a zero.";
    }

    if (
      variableExpenses === null ||
      variableExpenses < 0 ||
      variableExpenses >= 100
    ) {
      return "As despesas variáveis devem ser iguais ou superiores a zero e menores que 100%.";
    }

    if (
      profitMargin === null ||
      profitMargin < 0 ||
      profitMargin >= 100
    ) {
      return "A margem desejada deve ser igual ou superior a zero e menor que 100%.";
    }

    if (
      quantity === null ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return "Informe uma quantidade inteira de pelo menos uma unidade.";
    }

    if (fixedExpenses === null || fixedExpenses < 0) {
      return "Informe um valor válido para as despesas fixas.";
    }

    if (desiredPrice !== null && desiredPrice < 0) {
      return "O preço de venda desejado não pode ser negativo.";
    }

    if (variableExpenses + profitMargin >= 100) {
      return "A soma das despesas variáveis e da margem precisa ser menor que 100%.";
    }

    return null;
  }

  function resetResults() {
    lastCalculation = null;

    setText("suggestedPrice", currency(0));
    setText("markupFactor", "—");
    setText("totalRevenue", currency(0));
    setText("totalCost", currency(0));
    setText("totalVariable", currency(0));
    setText("grossProfit", currency(0));
    setText("fixedResult", currency(0));
    setText("netProfit", currency(0));
    setText(
      "resultExplanation",
      "Os resultados são estimativas e dependem dos dados informados."
    );

    const netResult = document.querySelector(".result-net");
    if (netResult) netResult.classList.remove("negative");

    downloadButton.disabled = true;
    saveButton.disabled = true;
  }

  function calculate(event) {
    if (event) event.preventDefault();

    formMessage.textContent = "";
    saveMessage.textContent = "";

    const error = validateInputs();

    if (error) {
      formMessage.textContent = error;
      return;
    }

    const unitCost = readNumber("unitCost");
    const variableRate = readNumber("variableExpenses") / 100;
    const profitRate = readNumber("profitMargin") / 100;
    const quantity = readNumber("quantity");
    const fixedExpenses = readNumber("fixedExpenses");
    const desiredPrice = readNumber("desiredPrice");
    const productName =
      byId("productName").value.trim() || "Produto ou serviço";

    /*
     * Markup divisor:
     * 1 - despesas variáveis - margem de lucro desejada.
     *
     * O preço sugerido considera a margem sobre o faturamento,
     * mas não inclui rateio das despesas fixas por unidade.
     */
    const markupDivisor = 1 - variableRate - profitRate;
    const suggestedUnitPrice = unitCost / markupDivisor;

    const selectedUnitPrice =
      desiredPrice !== null && desiredPrice > 0
        ? desiredPrice
        : suggestedUnitPrice;

    const totalRevenue = selectedUnitPrice * quantity;
    const totalCost = unitCost * quantity;
    const totalVariable = totalRevenue * variableRate;
    const grossProfit = totalRevenue - totalCost - totalVariable;
    const netProfit = grossProfit - fixedExpenses;
    const markupFactor = unitCost > 0
      ? suggestedUnitPrice / unitCost
      : null;

    lastCalculation = {
      date: new Date().toISOString(),
      productName,
      unitCost,
      variableRate: variableRate * 100,
      profitRate: profitRate * 100,
      quantity,
      fixedExpenses,
      suggestedUnitPrice,
      selectedUnitPrice,
      totalRevenue,
      totalCost,
      totalVariable,
      grossProfit,
      netProfit,
      markupFactor
    };

    renderResults(lastCalculation);
  }

  function renderResults(data) {
    setText("suggestedPrice", currency(data.suggestedUnitPrice));
    setText(
      "markupFactor",
      data.markupFactor === null
        ? "Não calculável (custo zero)"
        : `${numberFormat(data.markupFactor)}x`
    );
    setText("totalRevenue", currency(data.totalRevenue));
    setText("totalCost", currency(data.totalCost));
    setText("totalVariable", currency(data.totalVariable));
    setText("grossProfit", currency(data.grossProfit));
    setText("fixedResult", currency(data.fixedExpenses));
    setText("netProfit", currency(data.netProfit));

    const netResult = document.querySelector(".result-net");
    if (netResult) {
      netResult.classList.toggle("negative", data.netProfit < 0);
    }

    let explanation =
      `Estimativa para ${data.quantity} unidade(s) de "${data.productName}". ` +
      `O cálculo usa despesas variáveis de ${numberFormat(data.variableRate)}% ` +
      `e margem desejada de ${numberFormat(data.profitRate)}%.`;

    if (
      data.selectedUnitPrice !== data.suggestedUnitPrice
    ) {
      explanation +=
        ` O preço existente informado foi ${currency(data.selectedUnitPrice)}.`;
    } else {
      explanation +=
        " O preço sugerido não inclui rateio das despesas fixas por unidade.";
    }

    if (data.netProfit < 0) {
      explanation += " Atenção: o resultado estimado é negativo.";
    }

    setText("resultExplanation", explanation);

    downloadButton.disabled = false;
    saveButton.disabled = false;
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function downloadCsv() {
    if (!lastCalculation) return;

    const data = lastCalculation;
    const rows = [
      ["Campo", "Valor"],
      ["Produto ou serviço", data.productName],
      ["Data do cálculo", data.date],
      ["Custo unitário (R$)", data.unitCost],
      ["Despesas variáveis (%)", data.variableRate],
      ["Margem desejada (%)", data.profitRate],
      ["Quantidade", data.quantity],
      ["Despesas fixas (R$)", data.fixedExpenses],
      ["Preço sugerido por unidade (R$)", data.suggestedUnitPrice],
      ["Preço analisado por unidade (R$)", data.selectedUnitPrice],
      ["Valor total das vendas (R$)", data.totalRevenue],
      ["Custo total dos produtos (R$)", data.totalCost],
      ["Despesas variáveis (R$)", data.totalVariable],
      ["Lucro bruto estimado (R$)", data.grossProfit],
      ["Lucro líquido estimado (R$)", data.netProfit],
      ["Markup multiplicador", data.markupFactor ?? "Não calculável"]
    ];

    const csvContent =
      "\uFEFF" +
      rows.map((row) => row.map(csvEscape).join(";")).join("\r\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "resoluta-finance-calculo.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function saveCalculation() {
    if (!lastCalculation) return;

    try {
      const key = "resolutaFinanceCalculations";
      const existing = JSON.parse(localStorage.getItem(key) || "[]");

      if (!Array.isArray(existing)) {
        throw new Error("Formato de dados inválido.");
      }

      existing.push(lastCalculation);
      localStorage.setItem(key, JSON.stringify(existing));

      saveMessage.textContent =
        "Cálculo salvo neste navegador. Ele não é enviado para um servidor.";
    } catch (error) {
      saveMessage.textContent =
        "Não foi possível salvar. Verifique as configurações de armazenamento do navegador.";
    }
  }

  form.addEventListener("submit", calculate);

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      formMessage.textContent = "";
      saveMessage.textContent = "";
      resetResults();
    }, 0);
  });

  downloadButton.addEventListener("click", downloadCsv);
  saveButton.addEventListener("click", saveCalculation);

  menuToggle.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Fechar menu" : "Abrir menu"
    );
    menuToggle.textContent = isOpen ? "✕" : "☰";
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navigation.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menu");
      menuToggle.textContent = "☰";
    });
  });

  setText("currentYear", new Date().getFullYear());
  resetResults();
});
