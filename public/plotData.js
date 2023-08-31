// plotData.js

// Helper function to determine if a transaction is income or expenditure
function isIncome(tx, address) {
  return tx.recipient === address;
}

// Helper function to format date as DD-MM-YY
function formatDate(date) {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${day}-${month}-${year}`;
}

async function plotData() {
  console.log("plotData function called");

  const address = document.getElementById('address').value;
  const mosaicId = document.getElementById('mosaicId').value;
  console.log("Address:", address);
  console.log("MosaicId:", mosaicId); // Log the mosaicId to the console for debugging purposes

  let url = `http://localhost:5000/transactions?address=${address}&mosaicId=${mosaicId}`;

  const response = await fetch(url);
  console.log("Response:", response);

  if (!response.ok) {
    console.error('Failed to fetch data');
    return;
  }

  const data = await response.json();
  console.log("Data:", data);

  const yearRange = [2021, 2023]; // Adjust the year range here

  const width = 960,
    height = 240,
    cellSize = 17;

  // Create a dictionary to store the transaction amounts by date
  const incomeAmounts = {};
  const expenditureAmounts = {};

  // Create a dictionary to store transactions by date
  const transactionsByDate = {};

  // Process transactions and calculate max transaction amount
  data.forEach(tx => {
    const date = new Date(tx.timestamp);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dateString = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
    const amount = tx.amount || 0;

    if (isIncome(tx, address)) {
      if (!incomeAmounts[dateString]) {
        incomeAmounts[dateString] = 0;
      }
      incomeAmounts[dateString] += amount;
    } else {
      if (!expenditureAmounts[dateString]) {
        expenditureAmounts[dateString] = 0;
      }
      expenditureAmounts[dateString] += amount;
    }

    if (!transactionsByDate[dateString]) {
      transactionsByDate[dateString] = [];
    }
    transactionsByDate[dateString].push(tx);
  });

  const maxIncome = Math.max(...Object.values(incomeAmounts));
  const maxExpenditure = Math.max(...Object.values(expenditureAmounts));

  const logScale = d3.scaleLog()
    .domain([1, Math.max(maxIncome, maxExpenditure)])
    .range([0, 1]);

  const colorScale = d3.scaleSequential(d3.interpolatePlasma)
    .domain([0, 1]);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const container = d3.select("#container");

  const yearsContainer = container.selectAll(".year")
    .data(d3.range(yearRange[0], yearRange[1] + 1))
    .enter()
    .append("div")
    .attr("class", "year");

  yearsContainer.append("h2")
    .text(d => d);

  const incomeContainer = yearsContainer.append("div")
    .attr("class", "income-container");

  incomeContainer.append("h3")
    .text("Income");

  const incomeSvg = incomeContainer.append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(40, 40)"); // Adjust the margin to move the plot

  incomeSvg.selectAll(".monthLabel")
    .data(monthLabels)
    .enter()
    .append("text")
    .attr("class", "monthLabel")
    .attr("transform", function (d, i) {
      const x = i * (cellSize * 4.25) + (cellSize * 3); // Adjust the x position
      const y = 130; // Adjust the y position
      return `translate(${x}, ${y})`;
    })
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .text(function (d) {
      return d;
    });

  incomeSvg.selectAll(".dayLabel")
    .data(dayLabels)
    .enter()
    .append("text")
    .attr("class", "dayLabel")
    .attr("x", -25)
    .attr("y", function (d, i) {
      return (i * cellSize) + cellSize - 5;
    })
    .attr("font-size", "10px")
    .text(function (d) {
      return d;
    });

  const incomeRect = incomeSvg.selectAll(".day")
    .data(function (d) {
      return d3.timeDays(new Date(d, 0, 1), new Date(d + 1, 0, 1));
    })
    .enter()
    .append("rect")
    .attr("class", "day")
    .attr("width", cellSize)
    .attr("height", cellSize)
    .attr("x", function (d) {
      return d3.timeWeek.count(d3.timeYear(d), d) * cellSize;
    })
    .attr("y", function (d) {
      return d.getDay() * cellSize;
    })
    .datum(d3.timeFormat("%Y-%m-%d"))
    .style("stroke", "#ccc")
    .style("fill", function (d) {
      return d in incomeAmounts ? colorScale(logScale(incomeAmounts[d])) : "#fff";
    });

  incomeRect.append("title")
    .text(function (d) {
      if (d in incomeAmounts) {
        return `${formatDate(new Date(d))}: ${incomeAmounts[d]}`;
      } else {
        return formatDate(new Date(d));
      }
    });

  incomeSvg.selectAll(".month")
    .data(function (d) {
      return d3.timeMonths(new Date(d, 0, 1), new Date(d + 1, 0, 1));
    })
    .enter()
    .append("path")
    .attr("class", "month")
    .attr("d", monthPath);

  const expenditureContainer = yearsContainer.append("div")
    .attr("class", "expenditure-container");

  expenditureContainer.append("h3")
    .text("Expenditure");

  const expenditureSvg = expenditureContainer.append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(40, 40)"); // Adjust the margin to move the plot

  expenditureSvg.selectAll(".monthLabel")
    .data(monthLabels)
    .enter()
    .append("text")
    .attr("class", "monthLabel")
    .attr("transform", function (d, i) {
      const x = i * (cellSize * 4.25) + (cellSize * 3); // Adjust the x position
      const y = 130; // Adjust the y position
      return `translate(${x}, ${y})`;
    })
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .text(function (d) {
      return d;
    });

  expenditureSvg.selectAll(".dayLabel")
    .data(dayLabels)
    .enter()
    .append("text")
    .attr("class", "dayLabel")
    .attr("x", -25)
    .attr("y", function (d, i) {
      return (i * cellSize) + cellSize - 5;
    })
    .attr("font-size", "10px")
    .text(function (d) {
      return d;
    });

  const expenditureRect = expenditureSvg.selectAll(".day")
    .data(function (d) {
      return d3.timeDays(new Date(d, 0, 1), new Date(d + 1, 0, 1));
    })
    .enter()
    .append("rect")
    .attr("class", "day")
    .attr("width", cellSize)
    .attr("height", cellSize)
    .attr("x", function (d) {
      return d3.timeWeek.count(d3.timeYear(d), d) * cellSize;
    })
    .attr("y", function (d) {
      return d.getDay() * cellSize;
    })
    .datum(d3.timeFormat("%Y-%m-%d"))
    .style("stroke", "#ccc")
    .style("fill", function (d) {
      return d in expenditureAmounts ? colorScale(logScale(expenditureAmounts[d])) : "#fff";
    });

  expenditureRect.append("title")
    .text(function (d) {
      if (d in expenditureAmounts) {
        return `${formatDate(new Date(d))}: ${expenditureAmounts[d]}`;
      } else {
        return formatDate(new Date(d));
      }
    });

  expenditureSvg.selectAll(".month")
    .data(function (d) {
      return d3.timeMonths(new Date(d, 0, 1), new Date(d + 1, 0, 1));
    })
    .enter()
    .append("path")
    .attr("class", "month")
    .attr("d", monthPath);

  const tooltip = d3.select("#container") // Changed the selector to the container element
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  incomeRect.on("mouseover", function (event, d) {
    const transactions = transactionsByDate[d] || [];
    showTooltip(event.pageX, event.pageY, transactions);
  });

  expenditureRect.on("mouseover", function (event, d) {
    const transactions = transactionsByDate[d] || [];
    showTooltip(event.pageX, event.pageY, transactions);
  });

  incomeRect.on("mouseout", hideTooltip);
  expenditureRect.on("mouseout", hideTooltip);

  function showTooltip(x, y, transactions) {
    if (transactions.length === 0) {
      return;
    }

    const sumOfAmounts = transactions.reduce((sum, tx) => sum + tx.amount, 0); // Calculate the sum of amounts

    const tooltipContent = `<div>
    <strong>Date:</strong> ${formatDate(new Date(transactions[0].timestamp))}<br>
    <strong>Sum of Amounts:</strong> ${sumOfAmounts}<br>
  </div>`;

    tooltip.html(tooltipContent)
      .style("left", `${x}px`)
      .style("top", `${y}px`)
      .transition()
      .duration(200)
      .style("opacity", 0.9);
  }

  function hideTooltip() {
    tooltip.transition()
      .duration(200)
      .style("opacity", 0);
  }

  incomeRect.on("click", function (event, d) {
    const transactions = transactionsByDate[d] || [];
    renderTransactionTable(transactions);
  });

  expenditureRect.on("click", function (event, d) {
    const transactions = transactionsByDate[d] || [];
    renderTransactionTable(transactions);
  });

  function monthPath(t0) {
    var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
      d0 = t0.getDay(),
      w0 = d3.timeWeek.count(d3.timeYear(t0), t0),
      d1 = t1.getDay(),
      w1 = d3.timeWeek.count(d3.timeYear(t1), t1);
    return (
      "M" +
      (w0 + 1) * cellSize +
      "," +
      d0 * cellSize +
      "H" +
      w0 * cellSize +
      "V" +
      7 * cellSize +
      "H" +
      w1 * cellSize +
      "V" +
      (d1 + 1) * cellSize +
      "H" +
      (w1 + 1) * cellSize +
      "V" +
      0 +
      "H" +
      (w0 + 1) * cellSize +
      "Z"
    );
  }

  function renderTransactionTable(transactions) {
    const tableContainer = document.getElementById('transaction-table');

    // Clear the existing table
    while (tableContainer.firstChild) {
      tableContainer.firstChild.remove();
    }

    // Create the table header
    const table = document.createElement('table');
    table.classList.add('transaction-table');

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const headers = ['Sender', 'Recipient', 'Hash', 'Amount'];

    headers.forEach(headerText => {
      const headerCell = document.createElement('th');
      headerCell.textContent = headerText;
      headerRow.appendChild(headerCell);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create the table body
    const tbody = document.createElement('tbody');

    transactions.forEach(transaction => {
      const row = document.createElement('tr');

      const senderCell = document.createElement('td');
      const senderLink = document.createElement('a');
      senderLink.href = `https://symbol.fyi/accounts/${transaction.sender}`;
      senderLink.target = '_blank';
      senderLink.textContent = transaction.sender;
      senderCell.appendChild(senderLink);

      const recipientCell = document.createElement('td');
      const recipientLink = document.createElement('a');
      recipientLink.href = `https://symbol.fyi/accounts/${transaction.recipient}`;
      recipientLink.target = '_blank';
      recipientLink.textContent = transaction.recipient;
      recipientCell.appendChild(recipientLink);

      const hashCell = document.createElement('td');
      const hashLink = document.createElement('a');
      hashLink.href = `https://symbol.fyi/transactions/${transaction.hash}`;
      hashLink.target = '_blank';
      hashLink.textContent = transaction.hash;
      hashCell.appendChild(hashLink);

      const amountCell = document.createElement('td');
      amountCell.textContent = transaction.amount;

      row.appendChild(senderCell);
      row.appendChild(recipientCell);
      row.appendChild(hashCell);
      row.appendChild(amountCell);

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tableContainer.appendChild(table);
  }
}

document.getElementById('address-form').addEventListener('submit', function (event) {
  event.preventDefault(); // Prevent form submission
  plotData();
});
