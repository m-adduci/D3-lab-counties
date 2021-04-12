// Fetch jsons
const countiesJson =
  "data/counties.json";

const taxJson =
  "data/county_tax.json";

const promises = [d3.json(countiesJson), d3.json(taxJson)];

// SVG layout setup
const width = 965;
const height = 610;

const svg = d3
  .select("#choropleth-map")
  .append("svg")
  .attr("viewBox", [0, 0, width, height]);

Promise.all(promises).then(([topology, tax]) => {
  // geojson logic
  const geojson = topojson.feature(topology, topology.objects.counties);
  // Loop over geojson and tax data and append tax data to id's that match the tax FIPS id.
  geojson.features.forEach((geo) => {
    tax.forEach((data) => {
      if (data.fips === geo.id) {
        geo.tax = data.avg_realestate_taxes;
        geo.area = data["area_name"];
      }
    });
  });

  const eMin = d3.min(tax, (d) => d.avg_realestate_taxes);
  const eMax = d3.max(tax, (d) => d.avg_realestate_taxes);

  const xScale = d3.scaleLinear().domain([eMin, eMax]).rangeRound([-80, 500]);

  const colorScale = d3
    .scaleThreshold()
    .domain(d3.range(eMin, eMax, (eMax - eMin) / 8))
    .range(d3.schemeGreens[9]);

  const xAxis = d3
    .axisBottom(xScale)
    .tickSize(22)
    .tickFormat((d, i) => (i === 0 ? `$${Math.round(d)}` : Math.round(d)))
    .tickValues(colorScale.domain());

  const customXAxis = (g) => {
    g.call(xAxis);
    g.select(".domain").remove();
  };

  const path = d3.geoPath();

  svg
    .append("g")
    .attr("class", "counties")
    .selectAll("path")
    .data(geojson.features)
    .enter()
    .append("path")
    .attr("class", "county")
    .attr("data-fips", (d) => d.id)
    .attr("data-tax", (d) => d.tax)
    .attr("fill", (d) => colorScale(d.tax))
    .attr("d", path)
    .on("mouseover", (d) => tooltipMouseOver(d))
    .on("mouseout", (d) => tooltipMouseOut(d));

  svg
    .append("path")
    .datum(topojson.mesh(topology, topology.objects.states, (a, b) => a !== b))
    .attr("fill", "none")
    .attr("stroke", "#23242c")
    .attr("stroke-linejoin", "round")
    .attr("d", path);

  // Interaction logic
  const tooltip = d3
    .select("#choropleth-map")
    .append("div")
    .attr("id", "tooltip")
    .style("opacity", 0);

  const tooltipMouseOver = (d) => {
    tooltip.transition().duration(200).style("opacity", 0.9);

    tooltip
      .html(`${d.area}: $${d.tax}`)
      .attr("data-tax", d.tax)
      .style("left", d3.event.pageX + 20 + "px")
      .style("top", d3.event.pageY + 20 + "px");
  };

  const tooltipMouseOut = () =>
    tooltip.transition().duration(200).style("opacity", 0);

  // Legend logic
  const legend = svg
    .append("g")
    .attr("id", "legend")
    .attr("transform", `translate(${width / 2 - 100}, 15)`);

  legend
    .selectAll("rect")
    .data(
      colorScale.range().map((d) => {
        d = colorScale.invertExtent(d);
        if (!d[0]) [d[0]] = xScale.domain();
        if (!d[1]) [, d[1]] = xScale.domain();
        return d;
      })
    )
    .enter()
    .append("rect")
    .attr("height", 20)
    .attr("width", (d) => xScale(d[1]) - xScale(d[0]))
    .attr("x", (d) => xScale(d[0]))
    .attr("fill", (d) => colorScale(d[0]));

  legend.append("g").attr("id", "x-axis").call(customXAxis);
});
