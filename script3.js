// ------------------------------------------------- Global Variables -------------------------------------------------
let parsedData = null; // Will store the uploaded CSV or JSON data

// ------------------------------------------------- DOMContentLoaded Event -------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    // Initialize SVG elements and layout variables
    let svg, g, treeLayout, i;
    const width = window.innerWidth; // Get the width of the window
    const height = window.innerHeight; // Get the height of the window

    

    // ------------------------------------------------- Initialize SVG Area -------------------------------------------------
    function initializeSVG() {
        d3.select("#mindmap-container").html(""); // Clear previous SVG if any

        svg = d3.select("#mindmap-container")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .call(d3.zoom().scaleExtent([0.5, 5]) // Enable zooming and panning
                .on("zoom", (event) => {
                    g.attr("transform", event.transform); // Apply zoom transform
                }));

        svg.append("rect") // Background rectangle for better visuals
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "#f5f7fa");

        g = svg.append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`); // Center the graph

        treeLayout = d3.tree().nodeSize([120, 250]); // Set node sizes for tree layout
        i = 0; // Initialize node id counter
    }

    // ------------------------------------------------- Render Mind Map -------------------------------------------------
    function renderMindMap(data) {
        initializeSVG(); // Set up the SVG and canvas

        const root = d3.hierarchy(data); // Create a d3 hierarchy
        root.x0 = height / 2; // Initial x-coordinate
        root.y0 = 0; // Initial y-coordinate

        // ------------------------------------------------- Collapse Function -------------------------------------------------
        function collapse(node) {
            if (node.children) {
                node._children = node.children; // Hide children nodes initially
                node._children.forEach(collapse); // Recursively collapse children
                node.children = null;
            }
        }
        root.children?.forEach(collapse); // Collapse all nodes except root initially

        // ------------------------------------------------- Update Tree Function -------------------------------------------------
        function update(source) {
            const treeData = treeLayout(root); // Apply tree layout
            const nodes = treeData.descendants(); // Get all nodes
            const links = treeData.links(); // Get all links

            // Adjust node positions based on left or right positioning
            nodes.forEach(d => {
                d.y = d.depth * 250 * (d.data.position === "left" ? -1 : 1);
            });

            // JOIN new data with old elements
            const node = g.selectAll(".node").data(nodes, d => d.id || (d.id = ++i));

            // ENTER new nodes at the parent's previous position
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
                    update(d); // Re-render the updated structure
                })
                .on("mouseover", function () {
                    d3.select(this).raise(); // Bring to front
                    d3.select(this).select(".content-box")
                        .transition().duration(200)
                        .style("opacity", 0.9); // Show content box on hover
                })
                .on("mouseout", function () {
                    d3.select(this).select(".content-box")
                        .transition().duration(200)
                        .style("opacity", 0); // Hide content box on mouse out
                });

            // Container for node visuals
            const nodeContainer = nodeEnter.append("g").attr("class", "node-container");

            // Content box (background rectangle)
            nodeContainer.append("rect")
                .attr("class", "content-box")
                .attr("rx", 8).attr("ry", 8)
                .attr("fill", "#fff")
                .attr("stroke", "#4CAF50")
                .attr("stroke-width", 2)
                .style("opacity", 0)
                .attr("height", 60)
                .attr("width", 160)
                .attr("x", -80)
                .attr("y", -30);

            // Node title text
            nodeContainer.append("text")
                .attr("class", "topic-text")
                .attr("dy", -10)
                .style("font-size", "18px")
                .style("font-weight", "600")
                .style("font-family", "Arial")
                .style("cursor", "pointer")
                .text(d => d.data.name)
                .each(function (d) {
                    const bbox = this.getBBox(); // Get text box dimensions
                    d3.select(this.parentNode)
                        .append("line") // Underline below text
                        .attr("class", "underline")
                        .attr("x1", bbox.x)
                        .attr("x2", bbox.x + bbox.width)
                        .attr("y1", bbox.y + bbox.height + 2)
                        .attr("y2", bbox.y + bbox.height + 2)
                        .attr("stroke", "#2196F3")
                        .attr("stroke-width", 2);
                });

            // Node content text (small description)
            nodeContainer.append("text")
                .attr("class", "content-text")
                .attr("dy", 20)
                .style("font-size", "14px")
                .style("font-family", "Arial")
                .style("fill", "#666")
                .text(d => d.data.content);

            // Node center circle
            nodeContainer.append("circle")
                .attr("r", 10)
                .attr("fill", "#2196F3")
                .attr("stroke", "#fff")
                .attr("stroke-width", 2)
                .style("cursor", "pointer");

            // UPDATE positions of existing and new nodes
            const nodeUpdate = nodeEnter.merge(node);
            nodeUpdate.transition()
                .duration(500)
                .attr("transform", d => `translate(${d.y},${d.x})`);

            // Remove exiting nodes
            node.exit().transition()
                .duration(500)
                .attr("transform", d => `translate(${source.y},${source.x})`)
                .remove();

            // UPDATE links between nodes
            const link = g.selectAll(".link").data(links, d => d.target.id);

            // Enter new links at the parent's previous position
            const linkEnter = link.enter().insert("path", "g")
                .attr("class", "link")
                .attr("fill", "none")
                .attr("stroke", "#ccc")
                .attr("stroke-width", 2)
                .attr("d", d => `M${source.y0},${source.x0}L${source.y0},${source.x0}`);

            // UPDATE positions of links
            linkEnter.merge(link).transition()
                .duration(500)
                .attr("d", d => `M${d.source.y},${d.source.x}L${d.target.y},${d.target.x}`);

            // Remove exiting links
            link.exit().transition()
                .duration(500)
                .attr("d", d => `M${source.y},${source.x}L${source.y},${source.x}`)
                .remove();

            // Store the old positions for transitions
            nodes.forEach(d => {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        }

        // Call initial update
        update(root);
    }

    // ------------------------------------------------- Load JSON Button -------------------------------------------------
    document.getElementById("loadJson").addEventListener("click", () => {
        if (!parsedData) {
            alert("Please upload a valid CSV or JSON file first."); // Check if data is loaded
            return;
        }
        renderMindMap(parsedData); // Render mind map
    });

    // ------------------------------------------------- File Upload Handler -------------------------------------------------
    document.getElementById("fileInput").addEventListener("change", handleFileUpload);

    function handleFileUpload(event) {
        const file = event.target.files[0]; // Get the selected file
        if (!file) return;

        const reader = new FileReader(); // Create a new FileReader instance
        const fileExtension = file.name.split('.').pop().toLowerCase(); // Get file extension

        reader.onload = function (e) {
            const content = e.target.result; // Read file content

            try {
                if (fileExtension === "json") {
                    parsedData = JSON.parse(content); // Parse JSON data
                } else if (fileExtension === "csv") {
                    parsedData = csvToJson(content); // Convert CSV to JSON
                } else {
                    alert("Unsupported file type. Please upload a .csv or .json file.");
                }
            } catch (error) {
                console.error(error);
                alert("Error parsing the file."); // Error handling
            }
        };

        reader.readAsText(file); // Read file as plain text
    }

    // ------------------------------------------------- CSV to JSON Converter -------------------------------------------------
    function csvToJson(csvText) {
        const lines = csvText.split("\n").filter(line => line.trim() !== ""); // Split into lines and filter blanks
        const headers = lines[0].split(",").map(h => h.trim()); // Extract header names

        const json = {
            name: "Root", // Root node
            content: "",
            children: [] // All other nodes as children
        };

        for (let i = 1; i < lines.length; i++) {
            const obj = {};
            const currentLine = lines[i].split(",");

            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = currentLine[j]?.trim(); // Assign value to header key
            }

            json.children.push({
                name: obj.name || `Node ${i}`,
                content: obj.content || "",
                position: obj.position || "right",
                children: [] // No nested children yet
            });
        }
        return json; // Return final JSON structure
    }
}); // End of DOMContentLoaded
