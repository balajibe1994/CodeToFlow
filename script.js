mermaid.initialize({ startOnLoad: false });

let editor = CodeMirror.fromTextArea(document.getElementById("codeInput"), {
  lineNumbers: true,
  mode: "text/x-csharp",
  theme: "default",
  matchBrackets: true,
  autoCloseBrackets: true,
  indentUnit: 4,
  tabSize: 4
});

editor.setValue(`static void Main(string[] args)
{
    Console.WriteLine("Start Program");

    Program p = new Program();
    int result = p.Calculate(5);

    for (int i = 0; i < 3; i++)
    {
        Console.WriteLine("Outer loop: " + i);
        int j = 0;
        while (j < 2)
        {
            Console.WriteLine("  Inner loop: " + j);
            j++;
        }
    }

    int code = 2;
    switch (code)
    {
        case 1:
            Console.WriteLine("Code is 1");
            break;
        case 2:
            Console.WriteLine("Code is 2");
            break;
        default:
            Console.WriteLine("Unknown code");
            break;
    }
}`);

function onLanguageChange() {
  const lang = document.getElementById("languageSelect").value;
  switch (lang) {
    case "csharp": editor.setOption("mode", "text/x-csharp"); break;
    case "java": editor.setOption("mode", "text/x-java"); break;
    case "python": editor.setOption("mode", "python"); break;
    case "javascript": editor.setOption("mode", "javascript"); break;
    default: editor.setOption("mode", "text/plain");
  }
}

function getWrapLength() {
  const input = document.getElementById("wrapInput");
  const value = parseInt(input?.value || "60");
  return isNaN(value) ? 60 : Math.max(10, Math.min(value, 200));
}

function sanitizeLabel(label) {
  if (!label || label.trim() === ";") return null; // Ignore empty and ; lines
  label = label.replace(/[{}";]/g, '').replace(/\[|\]/g, '').replace(/\s+/g, ' ').trim();
  return wrapText(label, getWrapLength());
}

function wrapText(text, maxLength) {
  const words = text.split(' ');
  let lines = [], currentLine = '';
  for (let word of words) {
    if ((currentLine + ' ' + word).trim().length > maxLength) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += ' ' + word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  return lines.join('<br>');
}

function generateFlowchart() {
  showLoader();
  setTimeout(() => {
    const code = editor.getValue();
    const flowchartArea = document.getElementById("flowchart");
    const lines = code.split("\n");
    let mermaidCode = `flowchart TD\n`;
    let nodeCount = 1;
    let lastNode = "Start";
    mermaidCode += "Start([Start])\n";

    let isSwitch = false;
    let switchNodeId = "";

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed || trimmed === ";") continue;

      const label = sanitizeLabel(trimmed);
      if (!label) continue;

      const nodeId = `N${nodeCount++}`;

      if (trimmed.startsWith("switch")) {
        isSwitch = true;
        switchNodeId = nodeId;
        mermaidCode += `${nodeId}["${label}"]\n`;
        mermaidCode += `${lastNode} --> ${nodeId}\n`;
        continue;
      }

      if (isSwitch && /^case\s+.*:/.test(trimmed)) {
        const caseLabel = trimmed.replace(":", "");
        const caseNodeId = `N${nodeCount++}`;
        mermaidCode += `${caseNodeId}["${sanitizeLabel(caseLabel)}"]\n`;
        mermaidCode += `${switchNodeId} --> ${caseNodeId}\n`;
        lastNode = caseNodeId;
        continue;
      }

      if (isSwitch && /^default\s*:/.test(trimmed)) {
        const defNodeId = `N${nodeCount++}`;
        mermaidCode += `${defNodeId}["default"]\n`;
        mermaidCode += `${switchNodeId} --> ${defNodeId}\n`;
        lastNode = defNodeId;
        continue;
      }

      if (isSwitch && trimmed === "}") {
        isSwitch = false;
        continue;
      }

      if (/if\s*\((.*)\)/.test(trimmed)) {
        const condition = sanitizeLabel(trimmed.match(/if\s*\((.*)\)/)[1]);
        mermaidCode += `${nodeId}{"if ${condition}"}\n`;
        const yesId = `N${nodeCount++}`;
        const noId = `N${nodeCount++}`;
        mermaidCode += `${nodeId} -- Yes --> ${yesId}["Yes path"]\n`;
        mermaidCode += `${nodeId} -- No --> ${noId}["No path"]\n`;
        mermaidCode += `${lastNode} --> ${nodeId}\n`;
        lastNode = yesId;
        continue;
      }

      if (/for\s*\((.*)\)/.test(trimmed) || /while\s*\((.*)\)/.test(trimmed)) {
        const condition = sanitizeLabel(trimmed.match(/\((.*)\)/)[1]);
        mermaidCode += `${nodeId}{"loop ${condition}"}\n`;

        const bodyStartId = `N${nodeCount++}`;
        const loopEndId = `N${nodeCount++}`;
        const exitId = `N${nodeCount++}`;

        mermaidCode += `${lastNode} --> ${nodeId}\n`;
        mermaidCode += `${nodeId} -- Yes --> ${bodyStartId}["Loop body"]\n`;
        mermaidCode += `${bodyStartId} --> ${loopEndId}["Loop end"]\n`;
        mermaidCode += `${loopEndId} --> ${nodeId}\n`;
        mermaidCode += `${nodeId} -- No --> ${exitId}["Exit loop"]\n`;
        lastNode = exitId;
        continue;
      }

      mermaidCode += `${nodeId}["${label}"]\n`;
      mermaidCode += `${lastNode} --> ${nodeId}\n`;
      lastNode = nodeId;
    }

    mermaidCode += `${lastNode} --> End([End])`;
    const uniqueId = `mermaid-flowchart-${Date.now()}`;
    mermaid.render(uniqueId, mermaidCode).then(({ svg }) => {
      flowchartArea.innerHTML = svg;
      animateArrows();
      document.getElementById("exportBtn").disabled = false;
      hideLoader();
    }).catch(err => {
      hideLoader();
      document.getElementById("exportBtn").disabled = true;
      alert("Failed to generate diagram: " + err.message);
    });

  }, 100);
}

function showLoader() {
  document.getElementById("overlay").style.display = "block";
  document.getElementById("loader").style.display = "block";
}

function hideLoader() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("loader").style.display = "none";
}

function animateArrows() {
  const paths = document.querySelectorAll("#flowchart svg path");
  const colors = ["#00f", "#0a0", "#c00", "#f80", "#8000ff"];
  let colorIndex = 0;
  paths.forEach(path => {
    path.style.strokeDasharray = "8";
    path.style.strokeDashoffset = "500";
    path.style.animation = "dashMove 6s linear infinite";
    path.style.strokeWidth = "2";
    path.style.stroke = colors[colorIndex % colors.length];
    colorIndex++;
  });

  const style = document.createElement("style");
  style.textContent = `@keyframes dashMove { from { stroke-dashoffset: 500; } to { stroke-dashoffset: 0; } }`;
  document.head.appendChild(style);
}

function exportFlowchart() {
  const format = document.getElementById("exportFormat").value;

  switch (format) {
    case "svg":
      exportAsSVG();
      break;
    case "png":
      exportAsImage();
      break;
    case "pdf":
      exportAsPDF();
      break;
    default:
      alert("Unsupported format selected.");
  }
}

function exportAsSVG() {
  const svgElement = document.querySelector("#flowchart svg");

  if (!svgElement) {
    alert("No SVG found to export.");
    return;
  }

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "flowchart.svg";
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


function exportAsImage() {
  showLoader();

  const svgElement = document.querySelector("#flowchart svg");

  if (!svgElement) {
    hideLoader();
    alert("No diagram found to export.");
    return;
  }

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement("canvas");
  const svgSize = svgElement.getBoundingClientRect();
  canvas.width = svgSize.width * 2;
  canvas.height = svgSize.height * 2;

  const ctx = canvas.getContext("2d");
  const img = new Image();

  img.onload = function () {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const link = document.createElement("a");
    link.download = "flowchart.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    hideLoader();
  };

  img.onerror = function () {
    hideLoader();
    alert("Failed to load SVG for export.");
  };

  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
}

function exportAsPDF() {
  showLoader();

  const svgElement = document.querySelector("#flowchart svg");

  if (!svgElement) {
    hideLoader();
    alert("No flowchart SVG found.");
    return;
  }

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement("canvas");

  const bbox = svgElement.getBoundingClientRect(); // full rendered size
  const scale = 2; // High resolution export
  const canvasWidth = bbox.width * scale;
  const canvasHeight = bbox.height * scale;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d");
  const img = new Image();

  img.onload = function () {
    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;

    // Use points (1pt = 1.333px) for precision
    const pdfWidth = canvasWidth * 0.75;
    const pdfHeight = canvasHeight * 0.75;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: [pdfWidth, pdfHeight]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save("flowchart.pdf");
    hideLoader();
  };

  img.onerror = function () {
    hideLoader();
    alert("Image loading failed for export.");
  };

  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
}

function exportAsSVG() {
  const svgElement = document.querySelector("#flowchart svg");

  if (!svgElement) {
    alert("No SVG found to export.");
    return;
  }

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "flowchart.svg";
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

