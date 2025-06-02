let svg, g, simulation, zoomBehavior;
let _rootNode, _currentNodes, _currentLinks, _allNodesSelection;

// Helper function to wrap text within SVG <text> elements
function wrapSVGText(textElement, textString, maxWidth, lineHeightEmValue) {
    textElement.selectAll("tspan").remove();

    const words = String(textString || "Unnamed").split(/\s+/);
    let word;
    let line = [];
    const x = 0;
    let tspan = textElement.append("tspan").attr("x", x).attr("dy", "0em");

    for (let i = 0; i < words.length; i++) {
        word = words[i];
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > maxWidth && line.length > 1) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = textElement.append("tspan").attr("x", x).attr("dy", `${lineHeightEmValue}em`).text(word);
        }
    }
    return textElement.node().getBBox();
}

function initializeSVG() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  d3.select("#mindmap-container").html("");

  svg = d3.select("#mindmap-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  g = svg.append("g");

  zoomBehavior = d3.zoom().on("zoom", (event) => {
    g.attr("transform", event.transform);
  });

  svg.call(zoomBehavior);

  const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(1);
  svg.call(zoomBehavior.transform, initialTransform);

  g.append("g").attr("class", "links-group");
  g.append("g").attr("class", "nodes-group");
}

function applyNodeVisualsAndPhysics(selection) {
    selection.each(function(d) {
        const el = d3.select(this);
        const isEnter = el.select("circle, rect").empty();

        const basePadding = 25;
        const coordTextDisplayHeight = 18;
        const spacingBetweenTexts = 5;
        const lineHeightEm = 1.1;
        const mainTextFontSize = d.depth === 0 ? 20 : d.depth === 1 ? 16 : 14;

        let maxTextWidth;
        if (d.depth === 0) maxTextWidth = 150;
        else if (d.depth === 1) maxTextWidth = 110;
        else maxTextWidth = 160;

        let mainTextElement;
        if (isEnter) {
            mainTextElement = el.append("text")
                .attr("class", "main-node-text")
                .attr("text-anchor", "middle");
        } else {
            mainTextElement = el.select(".main-node-text");
        }
        mainTextElement.attr("font-size", `${mainTextFontSize}px`)
                       .attr("fill", d.shape === "circle" ? "#fff" : "#333");

        const wrappedTextBBox = wrapSVGText(mainTextElement, d.data.name, maxTextWidth, lineHeightEm);
        d.textActualWidth = wrappedTextBBox.width;
        d.textActualHeight = wrappedTextBBox.height;

        let shapeElement;
        if (d.shape === "circle") {
            const totalContentHeight = d.textActualHeight + spacingBetweenTexts + coordTextDisplayHeight;
            const horizontalRadius = d.textActualWidth / 2 + basePadding;
            const verticalRadius = totalContentHeight / 2 + basePadding;
            d.radius = Math.max(35, horizontalRadius, verticalRadius);

            if (isEnter) {
                shapeElement = el.insert("circle", ":first-child");
            } else {
                shapeElement = el.select("circle");
            }
            shapeElement.attr("r", d.radius)
                .attr("stroke-width", 2);
        } else {
            d.rectWidth = d.textActualWidth + 2 * basePadding;
            d.rectHeight = d.textActualHeight + spacingBetweenTexts + coordTextDisplayHeight + 2 * basePadding;

            if (isEnter) {
                shapeElement = el.insert("rect", ":first-child");
            } else {
                shapeElement = el.select("rect");
            }
            shapeElement.attr("x", -d.rectWidth / 2)
                .attr("y", -d.rectHeight / 2)
                .attr("rx", 10)
                .attr("ry", 10)
                .attr("width", d.rectWidth)
                .attr("height", d.rectHeight)
                .attr("stroke-width", 2);
        }

        const isExpandable = d._children && d._children.length > 0;
        const isExpanded = d.children && d.children.length > 0;

        shapeElement.attr("fill", () => {
            if (d.depth === 0) return "#3A5BA0";
            if (d.shape === "circle") return isExpandable ? "#81c784" : "#6cc2bd";
            return isExpandable ? "#fff59d" : "#fff";
        });

        if (isExpandable) {
            shapeElement.style("stroke-dasharray", "5,3").style("stroke", d.shape === "circle" ? "#ffb74d" : "#f57c00").style("stroke-width", 2.5);
        } else if (isExpanded) {
            shapeElement.style("stroke-dasharray", null).style("stroke", d.shape === "circle" ? "#fff" : "#6cc2bd").style("stroke-width", 2);
        } else {
             shapeElement.style("stroke-dasharray", null)
                        .style("stroke", d.depth === 0 ? "#FFFFFF" : (d.shape === "circle" ? "#e0e0e0" : "#bdbdbd"))
                        .style("stroke-width", d.depth === 0 ? 2.5 : 1.5);
        }

        const mainTextDesiredCenterY = -(spacingBetweenTexts + coordTextDisplayHeight) / 2;
        const mainTextElementY = mainTextDesiredCenterY - (wrappedTextBBox.y + wrappedTextBBox.height / 2);
        mainTextElement.attr("y", mainTextElementY);

        const coordFontSize = 10;
        let coordTextElement;
        if (isEnter) {
            coordTextElement = el.append("text")
                .attr("class", "coord-text")
                .attr("text-anchor", "middle")
                .style("pointer-events", "none");
        } else {
            coordTextElement = el.select(".coord-text");
        }
        coordTextElement.attr("font-size", `${coordFontSize}px`)
            .attr("fill", d.shape === "circle" ? "#f0f0f0" : "#555");

        const coordTextBaselineY = mainTextElementY + wrappedTextBBox.y + wrappedTextBBox.height + spacingBetweenTexts + coordFontSize * 0.8;
        coordTextElement.attr("y", coordTextBaselineY)
            .text(`X:${(d.x || 0).toFixed(0)}, Y:${(d.y || 0).toFixed(0)}`);
    });
}

function collapseRecursive(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapseRecursive);
        d.children = null;
    }
}

function handleClick(event, clickedNode) {
    event.stopPropagation();

    const wasExpanded = clickedNode.children && clickedNode.children.length > 0;
    let expanding = false;

    if (clickedNode.children) {
        collapseRecursive(clickedNode);
    } else if (clickedNode._children) {
        if (clickedNode.parent) {
            clickedNode.parent.children.forEach(sibling => {
                if (sibling !== clickedNode && sibling.children) {
                    collapseRecursive(sibling);
                }
            });
        }
        clickedNode.children = clickedNode._children;
        clickedNode._children = null;
        expanding = true;
    } else {
        return;
    }

    updateMindmapVisualization(clickedNode);

    if (expanding && clickedNode.children && clickedNode.children.length > 0) {
        setTimeout(() => {
            const nodesToInclude = [clickedNode, ...clickedNode.children];
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

            nodesToInclude.forEach(n => {
                const nodeX = n.x || 0;
                const nodeY = n.y || 0;
                let nodeWidth, nodeHeight;
                if (n.shape === 'circle') {
                    nodeWidth = nodeHeight = (n.radius || 30) * 2;
                } else {
                    nodeWidth = n.rectWidth || 60;
                    nodeHeight = n.rectHeight || 40;
                }
                minX = Math.min(minX, nodeX - nodeWidth / 2);
                maxX = Math.max(maxX, nodeX + nodeWidth / 2);
                minY = Math.min(minY, nodeY - nodeHeight / 2);
                maxY = Math.max(maxY, nodeY + nodeHeight / 2);
            });

            const svgWidth = parseFloat(svg.attr("width"));
            const svgHeight = parseFloat(svg.attr("height"));
            const padding = 60;
            let newScale;

            if (bbWidth <= 0 || bbHeight <= 0) {
                 newScale = d3.zoomTransform(svg.node()).k;
                 if (nodesToInclude.length === 1 && nodesToInclude[0].radius) {
                     newScale = Math.min(2, (Math.min(svgWidth, svgHeight) - 2 * padding) / (nodesToInclude[0].radius * 2));
                 } else if (nodesToInclude.length ===1 && nodesToInclude[0].rectWidth){
                     newScale = Math.min(2, (svgWidth - 2 * padding) / nodesToInclude[0].rectWidth, (svgHeight - 2 * padding) / nodesToInclude[0].rectHeight);
                 }
                 newScale = Math.max(0.5, newScale);
            } else {
                const bbWidth = maxX - minX; // Define bbWidth and bbHeight here
                const bbHeight = maxY - minY;
                const scaleX = (svgWidth - 2 * padding) / bbWidth;
                const scaleY = (svgHeight - 2 * padding) / bbHeight;
                newScale = Math.min(scaleX, scaleY, 2);
                newScale = Math.max(0.5, newScale);
            }

            const targetX_g = (minX + maxX) / 2;
            const targetY_g = (minY + maxY) / 2;

            const newTransform = d3.zoomIdentity
                                 .translate(svgWidth / 2, svgHeight / 2)
                                 .scale(newScale)
                                 .translate(-targetX_g, -targetY_g);

            svg.transition().duration(750).call(zoomBehavior.transform, newTransform);
        }, 250);
    }
}

function updateMindmapVisualization(sourceNode) {
    const duration = 250;

    _currentNodes = _rootNode.descendants();
    _currentLinks = _rootNode.links();

    _currentNodes.forEach(d => {
        if (d.xCurrent === undefined) d.xCurrent = sourceNode.x0 != null ? sourceNode.x0 : (d.parent ? d.parent.xCurrent : 0);
        if (d.yCurrent === undefined) d.yCurrent = sourceNode.y0 != null ? sourceNode.y0 : (d.parent ? d.parent.yCurrent : 0);
    });

    let nodeSelection = g.select(".nodes-group").selectAll(".node")
        .data(_currentNodes, d => d.id);

    nodeSelection.exit().transition().duration(duration)
        .attr("transform", d => `translate(${sourceNode.xCurrent},${sourceNode.yCurrent})`)
        .style("opacity", 0)
        .remove();

    const nodeEnter = nodeSelection.enter().append("g")
        .attr("class", "node")
        .attr("id", d => `node-${d.id}`)
        .attr("transform", d => `translate(${sourceNode.xCurrent},${sourceNode.yCurrent})`)
        .style("opacity", 0)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
        .on("click", handleClick);

    _allNodesSelection = nodeEnter.merge(nodeSelection);
    applyNodeVisualsAndPhysics(_allNodesSelection);

    _allNodesSelection.transition().duration(duration)
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .style("opacity", 1);

    let linkSelection = g.select(".links-group").selectAll("line.link")
        .data(_currentLinks, d => d.target.id);

    linkSelection.exit().transition().duration(duration)
        .attr("x1", sourceNode.xCurrent).attr("y1", sourceNode.yCurrent)
        .attr("x2", sourceNode.xCurrent).attr("y2", sourceNode.yCurrent)
        .remove();

    const linkEnter = linkSelection.enter().insert("line", ".nodes-group")
        .attr("class", "link")
        .attr("stroke", "#aaa")
        .attr("stroke-opacity", 0)
        .attr("stroke-width", 2)
        .attr("x1", sourceNode.xCurrent)
        .attr("y1", sourceNode.yCurrent)
        .attr("x2", sourceNode.xCurrent)
        .attr("y2", sourceNode.yCurrent);

    linkEnter.merge(linkSelection).transition().duration(duration)
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)
        .attr("stroke-opacity", 0.6);

    simulation.nodes(_currentNodes);
    simulation.force("link").links(_currentLinks); // Distances are set in renderMindMap's initial setup
    simulation.force("collision").radius(d => {
        const collisionPadding = 25; // Increased padding
        if (d.shape === "circle") {
            return (d.radius || 30) + collisionPadding;
        } else {
            return Math.max(d.rectWidth || 60, d.rectHeight || 40) / 2 + collisionPadding;
        }
    }).initialize(_currentNodes);

    simulation.alpha(0.6).restart();

    _currentNodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}

function renderMindMap(data) {
  initializeSVG();

  _rootNode = d3.hierarchy(data);

  _rootNode.x0 = 0;
  _rootNode.y0 = 0;
  _rootNode.fx = 0;
  _rootNode.fy = 0;

  _rootNode.descendants().forEach((d, i) => {
    d.id = i;
    d.shape = d.depth === 2 ? "rect" : "circle";
    d.x = d.x || 0;
    d.y = d.y || (d.depth * 100);
    d.xCurrent = d.x;
    d.yCurrent = d.y;

    if (d.depth >= 1) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        }
    }
  });

   _currentNodes = _rootNode.descendants();
   _currentLinks = _rootNode.links();

  simulation = d3.forceSimulation(_currentNodes)
    .force("link", d3.forceLink(_currentLinks).id(d => d.id)
        .distance(d => d.source.depth === 0 ? 280 : 170) // Adjusted distances
        .strength(0.9))
    .force("charge", d3.forceManyBody().strength(d => d.depth === 0 ? -3000 : d.depth === 1 ? -2000 : -800))
    .force("center", d3.forceCenter(0, 0))
    .on("tick", ticked);

   g.select(".links-group").selectAll("line.link")
    .data(_currentLinks, d => d.target.id)
    .join("line")
    .attr("class", "link")
    .attr("stroke", "#aaa")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 2);

  const initialNodeSelection = g.select(".nodes-group").selectAll(".node")
    .data(_currentNodes, d => d.id)
    .join("g")
    .attr("class", "node")
    .attr("id", d => `node-${d.id}`)
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended))
    .on("click", handleClick);

  _allNodesSelection = initialNodeSelection;
  applyNodeVisualsAndPhysics(_allNodesSelection);

  simulation.force("collision", d3.forceCollide().radius(d => {
    const collisionPadding = 25; // Increased padding
    if (d.shape === "circle") {
      return (d.radius || 30) + collisionPadding;
    } else {
      return Math.max(d.rectWidth || 60, d.rectHeight || 40) / 2 + collisionPadding;
    }
  }).initialize(_currentNodes));

  simulation.alpha(1).restart();
}

function ticked() {
    if (_allNodesSelection) {
      _allNodesSelection.attr("transform", d => {
          d.xCurrent = d.x;
          d.yCurrent = d.y;
          return `translate(${d.x},${d.y})`;
        })
        .selectAll(".coord-text")
        .text(d => `X:${d.x.toFixed(0)}, Y:${d.y.toFixed(0)}`);
    }

    const currentLinkSelection = g.select(".links-group").selectAll("line.link");
    if (currentLinkSelection) {
      currentLinkSelection
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
    }
}

function dragstarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  if (d.depth !== 0) {
    d.fx = d.x;
    d.fy = d.y;
  } else {
    d.fx = d.x;
    d.fy = d.y;
  }
}

function dragged(event, d) {
  if (d.depth !== 0 || d.fx === null) {
    d.fx = event.x;
    d.fy = event.y;
  } else {
    d.fx = event.x;
    d.fy = event.y;
  }
}

function dragended(event, d) {
  if (!event.active) simulation.alphaTarget(0);
  if (d.depth !== 0) {
    d.fx = null;
    d.fy = null;
  }
}

document.getElementById("loadJson").addEventListener("click", () => {
  const inputText = document.getElementById("jsonInput").value;
  try {
    const data = JSON.parse(inputText);
    renderMindMap(data);
  } catch (err) {
    alert("Invalid JSON: " + err.message);
    console.error("JSON Parsing Error:", err);
  }
});

document.getElementById("uploadJson").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = readEvent => {
      try {
        const json = JSON.parse(readEvent.target.result);
        renderMindMap(json);
        document.getElementById("jsonInput").value = JSON.stringify(json, null, 2);
      } catch (err) {
        alert("Invalid JSON file: " + err.message);
        console.error("File JSON Parsing Error:", err);
      }
    };
    reader.readAsText(file);
  };
  input.click();
});

document.getElementById("uploadCsv").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv";
  input.onchange = e_csv => {
    const file = e_csv.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = readEvent => {
      try {
        const csvText = readEvent.target.result;
        const lines = csvText.trim().split("\n");
        if (lines.length < 1) {
            alert("CSV file is empty or invalid.");
            return;
        }
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        if (headers.length === 0 || headers[0] === "") {
            alert("CSV headers are missing or invalid.");
            return;
        }

        const data = lines.slice(1).map(line => {
          const values = line.split(",");
          const obj = {};
          headers.forEach((h, i) => obj[h] = values[i]?.trim() || "");
          return obj;
        });

        const treeData = {
          name: "Root (CSV: " + (file.name || "Untitled") + ")",
          children: data.filter(row => row.name || Object.values(row).some(val => val !== "")).map((row, i) => ({
            name: row.name || `Item ${i + 1}`,
            data: row
          }))
        };
        if (treeData.children.length === 0 && data.length > 0) {
            treeData.children = data.map((row, i) => ({
                name: `Item ${i + 1}`,
                data: row
            }));
        }

        renderMindMap(treeData);
        document.getElementById("jsonInput").value = JSON.stringify(treeData, null, 2);
      } catch (err) {
        alert("Error processing CSV file: " + err.message);
        console.error("CSV Processing Error:", err);
      }
    };
    reader.readAsText(file);
  };
  input.click();
});

document.getElementById("exportGraph").addEventListener("click", () => {
  if (!g || !_currentNodes || _currentNodes.length === 0) {
    alert("No mind map loaded or no nodes to export.");
    return;
  }
  const exportedNodes = [];
  _currentNodes.forEach(d_node => {
    if (d_node && d_node.data) {
      exportedNodes.push({
        name: d_node.data.name,
        content: d_node.data.content || (d_node.data.data ? JSON.stringify(d_node.data.data) : ""),
        x: d_node.x,
        y: d_node.y,
        fx: d_node.fx,
        fy: d_node.fy,
        depth: d_node.depth,
        isExpanded: !!d_node.children,
        hasHiddenChildren: !!d_node._children
      });
    }
  });

  if (exportedNodes.length === 0) {
      alert("No node data found to export (ensure nodes have .data property).");
      return;
  }

  const blob = new Blob([JSON.stringify(exportedNodes, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a_export = document.createElement("a");
  a_export.href = url;
  a_export.download = "mind_map_export.json";
  document.body.appendChild(a_export);
  a_export.click();
  document.body.removeChild(a_export);
  URL.revokeObjectURL(url);
});

const dragbar = document.getElementById("dragbar");
if (dragbar) {
    let isDragging = false;
    dragbar.addEventListener("mousedown", (e_drag) => {
      e_drag.preventDefault();
      isDragging = true;
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener("mousemove", (e_drag) => {
      if (!isDragging) return;
      e_drag.preventDefault();
      const sidebar = document.getElementById("sidebar");
      if (sidebar) {
          const newWidth = Math.max(200, Math.min(e_drag.clientX, window.innerWidth * 0.7));
          sidebar.style.width = `${newWidth}px`;
      }
    });
    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
} else {
    console.warn("Dragbar element not found.");
}