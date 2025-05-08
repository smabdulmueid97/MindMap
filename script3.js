document.addEventListener("DOMContentLoaded", () => {
    let svg, g, treeLayout, i;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const sidebar = document.getElementById("sidebar");
    const savedWidth = localStorage.getItem("sidebarWidth");
    if (savedWidth) {
        sidebar.style.width = savedWidth;
    }

    function initializeSVG() {
        d3.select("#mindmap-container").html("");
        svg = d3.select("#mindmap-container")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .call(d3.zoom().scaleExtent([0.5, 5]).on("zoom", (event) => {
                g.attr("transform", event.transform);
            }));

        svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "#f5f7fa");

        g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);
        treeLayout = d3.tree().nodeSize([120, 250]);
        i = 0;
    }

    function renderMindMap(data) {
        initializeSVG();
        const root = d3.hierarchy(data);
        root.x0 = height / 2;
        root.y0 = 0;

        function collapse(node) {
            if (node.children) {
                node._children = node.children;
                node._children.forEach(collapse);
                node.children = null;
            }
        }

        root.children?.forEach(collapse);

        function update(source) {
            const treeData = treeLayout(root);
            const nodes = treeData.descendants();
            const links = treeData.links();

            nodes.forEach(d => {
                d.y = d.depth * 250 * (d.data.position === "left" ? -1 : 1);
            });

            const node = g.selectAll(".node").data(nodes, d => d.id || (d.id = ++i));

            const nodeEnter = node.enter().append("g")
                .attr("class", "node")
                .attr("transform", d => `translate(${source.y0},${source.x0})`)
                .on("click", (event, d) => {
                    if (!d.children && d._children) {
                        d.parent?.children?.forEach(sibling => {
                            if (sibling !== d && sibling.children) {
                                sibling._children = sibling.children;
                                sibling.children = null;
                            }
                        });
                        d.children = d._children;
                        d._children = null;
                    } else {
                        d._children = d.children;
                        d.children = null;
                    }
                    update(d);
                })
                .on("mouseover", function () {
                    d3.select(this).raise();
                    d3.select(this).select(".content-box")
                        .transition().duration(200)
                        .style("opacity", 0.9);
                })
                .on("mouseout", function () {
                    d3.select(this).select(".content-box")
                        .transition().duration(200)
                        .style("opacity", 0);
                });

            const nodeContainer = nodeEnter.append("g").attr("class", "node-container");

            nodeContainer.append("rect")
                .attr("class", "content-box")
                .attr("rx", 8)
                .attr("ry", 8)
                .attr("fill", "#fff")
                .attr("stroke", "#4CAF50")
                .attr("stroke-width", 2)
                .style("opacity", 0)
                .attr("height", 60)
                .attr("width", 160)
                .attr("x", -80)
                .attr("y", -30);

            nodeContainer.append("text")
                .attr("class", "topic-text")
                .attr("dy", -10)
                .style("font-size", "18px")
                .style("font-weight", "600")
                .style("font-family", "Arial")
                .style("cursor", "pointer")
                .text(d => d.data.name)
                .each(function (d) {
                    const bbox = this.getBBox();
                    d3.select(this.parentNode)
                        .append("line")
                        .attr("class", "underline")
                        .attr("x1", bbox.x)
                        .attr("x2", bbox.x + bbox.width)
                        .attr("y1", bbox.y + bbox.height + 2)
                        .attr("y2", bbox.y + bbox.height + 2)
                        .attr("stroke", "#2196F3")
                        .attr("stroke-width", 2);
                });

            nodeContainer.append("text")
                .attr("class", "content-text")
                .attr("dy", 20)
                .style("font-size", "14px")
                .style("font-family", "Arial")
                .style("fill", "#666")
                .text(d => d.data.content);

            nodeContainer.append("circle")
                .attr("r", 10)
                .attr("fill", "#2196F3")
                .attr("stroke", "#fff")
                .attr("stroke-width", 2)
                .style("cursor", "pointer");

            nodeEnter.merge(node)
                .transition().duration(500)
                .attr("transform", d => `translate(${d.y},${d.x})`);

            node.exit().transition().duration(500).remove();

            const link = g.selectAll(".link").data(links, d => d.target.id);

            const linkEnter = link.enter().insert("path", "g")
                .attr("class", "link")
                .attr("fill", "none")
                .attr("stroke", "#ccc")
                .attr("stroke-width", 2)
                .attr("d", d => `M${source.y0},${source.x0}L${source.y0},${source.x0}`);

            linkEnter.merge(link).transition()
                .duration(500)
                .attr("d", d => `M${d.source.y},${d.source.x}L${d.target.y},${d.target.x}`);

            link.exit().transition().duration(500).remove();

            nodes.forEach(d => {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        }

        update(root);
    }

    document.getElementById("loadJson").addEventListener("click", () => {
        const inputText = document.getElementById("jsonInput").value;
        try {
            const data = JSON.parse(inputText);
            renderMindMap(data);
        } catch (err) {
            alert("Invalid JSON");
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
            reader.onload = e => {
                try {
                    const json = JSON.parse(e.target.result);
                    renderMindMap(json);
                    document.getElementById("jsonInput").value = JSON.stringify(json, null, 2);
                    updateLineNumbers();
                } catch {
                    alert("Invalid JSON file.");
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
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = e => {
                const csvText = e.target.result;
                const lines = csvText.trim().split("\n");
                const headers = lines[0].split(",");

                const data = lines.slice(1).map(line => {
                    const values = line.split(",");
                    const obj = {};
                    headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
                    return obj;
                });

                const treeData = {
                    name: "Root",
                    content: "CSV Import",
                    children: data.map((row, i) => ({
                        name: row.name || `Item ${i + 1}`,
                        content: row.content || "",
                        position: row.position || "right"
                    }))
                };

                renderMindMap(treeData);
                document.getElementById("jsonInput").value = JSON.stringify(treeData, null, 2);
                updateLineNumbers();
            };
            reader.readAsText(file);
        };
        input.click();
    });

    document.getElementById("exportGraph").addEventListener("click", () => {
        if (!g) return alert("No mind map loaded.");

        const nodes = [];
        g.selectAll(".node").each(function () {
            const datum = d3.select(this).datum();
            nodes.push({
                name: datum.data.name,
                content: datum.data.content,
                x: datum.x,
                y: datum.y
            });
        });

        const blob = new Blob([JSON.stringify(nodes, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "graph_coordinates.json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});

// ===== Line Numbers (Global) =====
const jsonInput = document.getElementById("jsonInput");
const lineNumbers = document.getElementById("lineNumbers");

jsonInput.addEventListener("input", updateLineNumbers);
jsonInput.addEventListener("scroll", () => {
    lineNumbers.scrollTop = jsonInput.scrollTop;
});

function updateLineNumbers() {
    const lines = jsonInput.value.split("\n").length;
    lineNumbers.textContent = Array.from({ length: lines }, (_, i) => i + 1).join("\n");
}
updateLineNumbers();

// ===== Draggable Sidebar =====
const dragbar = document.getElementById("dragbar");
let isDragging = false;

dragbar.addEventListener("mousedown", () => {
    isDragging = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
});

document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const maxWidth = window.innerWidth * 0.7;
    const newWidth = Math.min(Math.max(e.clientX, 200), maxWidth);
    document.getElementById("sidebar").style.width = `${newWidth}px`;
    localStorage.setItem("sidebarWidth", `${newWidth}px`);
});

document.addEventListener("mouseup", () => {
    isDragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
});
