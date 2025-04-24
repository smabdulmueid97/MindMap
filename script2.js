document.addEventListener("DOMContentLoaded", () => {
    let svg, g, treeLayout, i;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // ===== Restore Sidebar Width from localStorage =====
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

            const nodeUpdate = nodeEnter.merge(node);
            nodeUpdate.transition()
                .duration(500)
                .attr("transform", d => `translate(${d.y},${d.x})`);

            node.exit().transition()
                .duration(500)
                .attr("transform", d => `translate(${source.y},${source.x})`)
                .remove();

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

            link.exit().transition()
                .duration(500)
                .attr("d", d => `M${source.y},${source.x}L${source.y},${source.x}`)
                .remove();

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
            console.error("Invalid JSON:", err);
            alert("Invalid JSON. Please check your input.");
        }
    });
});

// ========== LINE NUMBERING ==========
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

// ========== DRAGGABLE SIDEBAR ==========
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
    sidebar.style.width = `${newWidth}px`;

    // Save sidebar width
    localStorage.setItem("sidebarWidth", `${newWidth}px`);
});

document.addEventListener("mouseup", () => {
    isDragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
});
