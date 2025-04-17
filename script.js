document.addEventListener("DOMContentLoaded", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = d3.select("#mindmap-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(d3.zoom()
            .scaleExtent([0.5, 5])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            })
        );

    // Add gradient background
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#f5f7fa"); // Light gradient background

    const g = svg.append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    // Load data from data.json
    d3.json("data.json").then(data => {
        if (!data) {
            console.error("Error: No data loaded!");
            return;
        }

        const root = d3.hierarchy(data);
        root.x0 = height / 2;
        root.y0 = 0;

        const treeLayout = d3.tree().nodeSize([120, 250]);

        // Collapse all nodes by default
        function collapse(node) {
            if (node.children) {
                node._children = node.children;
                node._children.forEach(collapse);
                node.children = null;
            }
        }
        root.children.forEach(collapse);

        // Update function
        function update(source) {
            const treeData = treeLayout(root);
            const nodes = treeData.descendants();
            const links = treeData.links();

            // Position nodes
            nodes.forEach(d => {
                d.y = d.depth * 250 * (d.data.position === "left" ? -1 : 1);
            });

            // Nodes
            const node = g.selectAll(".node")
                .data(nodes, d => d.id || (d.id = ++i));

            const nodeEnter = node.enter().append("g")
                .attr("class", "node")
                .attr("transform", d => `translate(${source.y0},${source.x0})`)
                .on("click", (event, d) => {
                    // If expanding this node
                    if (!d.children && d._children) {
                        // Collapse siblings
                        if (d.parent && d.parent.children) {
                            d.parent.children.forEach(sibling => {
                                if (sibling !== d && sibling.children) {
                                    sibling._children = sibling.children;
                                    sibling.children = null;
                                }
                            });
                        }
                
                        // Expand clicked node
                        d.children = d._children;
                        d._children = null;
                    } else {
                        // Collapse this node
                        d._children = d.children;
                        d.children = null;
                    }
                
                    update(d);
                })
                
                .on("mouseover", function(d) {
                    d3.select(this).raise();
                    d3.select(this).select(".content-box")
                        .transition().duration(200)
                        .style("opacity", 0.9);
                })
                .on("mouseout", function(d) {
                    d3.select(this).select(".content-box")
                        .transition().duration(200)
                        .style("opacity", 0);
                });

            // Node container for better grouping
            const nodeContainer = nodeEnter.append("g")
                .attr("class", "node-container");

            // Background rectangle for content
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

            // Main topic text with underline
            nodeContainer.append("text")
                .attr("class", "topic-text")
                .attr("dy", -10)
                .style("font-size", "18px")
                .style("font-weight", "600")
                .style("font-family", "Arial")
                .style("cursor", "pointer")
                .text(d => d.data.name)
                .each(function(d) {
                    // Add underline
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

            // Content text
            nodeContainer.append("text")
                .attr("class", "content-text")
                .attr("dy", 20)
                .style("font-size", "14px")
                .style("font-family", "Arial")
                .style("fill", "#666")
                .text(d => d.data.content);

            // Node circle
            nodeContainer.append("circle")
                .attr("r", 10)
                .attr("fill", "#2196F3")
                .attr("stroke", "#fff")
                .attr("stroke-width", 2)
                .style("cursor", "pointer");

            // Update node positions
            const nodeUpdate = nodeEnter.merge(node);
            nodeUpdate.transition()
                .duration(500)
                .attr("transform", d => `translate(${d.y},${d.x})`);

            // Remove exiting nodes
            node.exit().transition()
                .duration(500)
                .attr("transform", d => `translate(${source.y},${source.x})`)
                .remove();

            // Links (straight lines)
            const link = g.selectAll(".link")
                .data(links, d => d.target.id);

            const linkEnter = link.enter().insert("path", "g")
                .attr("class", "link")
                .attr("fill", "none")
                .attr("stroke", "#ccc")
                .attr("stroke-width", 2)
                .attr("d", d => {
                    // Straight line generator
                    return `M${source.y0},${source.x0}L${source.y0},${source.x0}`;
                });

            const linkUpdate = linkEnter.merge(link);
            linkUpdate.transition()
                .duration(500)
                .attr("d", d => {
                    // Straight line between nodes
                    return `M${d.source.y},${d.source.x}L${d.target.y},${d.target.x}`;
                });

            // Remove exiting links
            link.exit().transition()
                .duration(500)
                .attr("d", d => {
                    return `M${source.y},${source.x}L${source.y},${source.x}`;
                })
                .remove();

            // Store positions
            nodes.forEach(d => {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        }

        let i = 0;
        update(root);
    }).catch(error => {
        console.error("Error loading data.json:", error);
    });
});