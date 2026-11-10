# FAIR Loss Exceedance Curve Builder

An interactive app for learning cyber risk quantification with the Open FAIR model. You enter a register of loss scenarios as calibrated ranges. The app runs a Monte Carlo simulation of up to 100,000 years, draws the loss exceedance curve (LEC), and checks it against your risk appetite. It also tests whether one proposed control pays for itself and moves the firm back inside appetite.

The app is a teaching tool, not a risk-reporting or insurance-pricing system. It favors clear, visible math over production features.

**Live app:** https://seeking-eureka.com/FAIR-loss-exceedance-curve-builder/

## What the App Shows

The Simulator tab shows four results:

1. **Annualized loss expectancy (ALE)**: the average simulated annual loss, with its Monte Carlo error and the exact value from the PERT means.
2. **Risk appetite check**: for each appetite point, the simulated chance of losing more than that amount in a year, compared with your tolerance. Each point is marked Inside, Outside, or Too close to call, based on the 95% Monte Carlo band.
3. **1-in-100 year loss**: the 99th percentile of annual loss, plus the 1-in-20 loss and the average of the worst 1% of years.
4. **Control value**: the drop in ALE from the control under evaluation, compared with its annual cost.

Other panels include the loss exceedance curve (linear or log probability axis, with the control curve and earlier batches overlaid), annualized loss by scenario, a convergence chart, a Monte Carlo precision note, a step-by-step breakdown of the calculation for any scenario, and a simulation log.

The Guide & Math tab walks through the model. Its worked examples update live from whatever values you enter.

## The Model

The register follows the Open FAIR Risk Taxonomy (O-RT) and Risk Analysis (O-RA) standards.

| Piece | Specification |
|---|---|
| Threat Event Frequency (TEF) | PERT(min, most likely, max), events per year |
| Vulnerability | PERT(min, most likely, max), probability a threat event becomes a loss event |
| Loss Event Frequency (LEF) | TEF × Vulnerability, or entered directly as PERT |
| Loss events in a year | Poisson(LEF) |
| Primary loss per event | PERT(min, most likely, max) |
| Secondary loss event frequency (SLEF) | PERT, probability an event also causes secondary loss |
| Secondary loss per event | PERT, drawn only when a secondary loss occurs |
| Annual loss | Sum over scenarios and events |

**PERT.** Each range becomes a Beta distribution with shape α = 1 + 4(ML − min)/(max − min) and β = 1 + 4(max − ML)/(max − min), rescaled to [min, max]. Its mean is (min + 4·ML + max) / 6.

**Simulation.** The app simulates 100,000 years with a seeded random number generator. The stepper shows results after 100, 250, 500, 1K, 2.5K, 5K, 10K, 25K, 50K, and 100K years, all prefixes of the same run. The run with the control reuses the same random numbers (common random numbers), so the difference between the two curves reflects the control, not noise.

**Appetite check.** For tolerance t at loss x, p̂ = P(annual loss > x). The 95% band is p̂ ± 1.96·√(p̂(1 − p̂)/n). The point is Inside if the whole band is below t, Outside if it is all above t, and Too close to call otherwise. The precision card estimates the runs needed to settle the question: p(1 − p)(1.96 / |p − t|)².

**Control.** A control targets one scenario and can cut TEF, Vulnerability, primary loss, and secondary loss by 0–90% each. The categories follow O-RA: avoidance and deterrence act on TEF, resistance on Vulnerability, and responsive controls on loss magnitude. When LEF is entered directly, the TEF and Vulnerability reductions apply to LEF as a whole. Return = (ALE reduction − cost) / cost.

## Using the App

- Open any scenario in the register to edit its ranges, rename it, switch between deriving LEF and estimating it directly, or remove it. Add up to 10 scenarios.
- Edit the appetite curve: up to 5 points, each a loss amount and the highest acceptable chance of exceeding it. The focus point drives the convergence chart and the precision card.
- Configure the control, switch it on or off, and watch the control curve and return update.
- Step through the run counts with the arrows or press Play. Clicking a row in the simulation log jumps to that run count. "Re-run with new seed" draws a fresh simulation.

**Default data.** Six illustrative scenarios for a mid-size firm: ransomware outage, business email compromise, customer data breach, critical vendor or cloud outage, insider misuse, and DDoS on a payment API. The appetite is at most 60% chance of losing more than $1M in a year, 10% for $5M, and 1% for $20M. The control is "Immutable backups + EDR upgrade" at $150K a year, aimed at ransomware, cutting Vulnerability and primary loss by 40% each.

With 100,000 years at seed 42, ALE is about $2.26M and the 1-in-100 year loss is about $13M. The chance of losing more than $5M is about 12.9%, which is outside the 10% tolerance. With the control, ALE falls by about $337K, the return is about 124%, and the $5M chance drops to about 9.5%, back inside appetite.

**Input rules:**

- Each range needs minimum ≤ most likely ≤ maximum. All three can be equal, which fixes the value.
- TEF and LEF are events per year, 0 to 500. A maximum above 50 a year gets a soft warning.
- Vulnerability and SLEF are probabilities from 0% to 100%.
- Losses are in $K and must be 0 or more. You can also type values like 1.5M or 300K. A maximum more than 100 times the minimum gets a soft warning.
- The register holds 1 to 10 scenarios and the appetite curve 1 to 5 points. Larger losses can't have a higher tolerance than smaller ones.
- Control reductions run from 0% to 90%, and the annual cost must be 0 or more.

## Running Locally

There's no build step and nothing to install. Clone the repo and open `index.html` in a browser.

```
index.html   page structure and static guide content
styles.css   dark theme and layout
assets/      Seeking Eureka logo and favicon
app.js       PERT sampling, Poisson frequency, Monte Carlo engine, appetite check, SVG charts, and dynamic guide text
preview.png  link-preview image
```

The app is plain JavaScript with hand-drawn SVG charts and no third-party libraries. Fonts load from Google Fonts. Without a connection, the browser falls back to system fonts.

## Sources and Credits

**Open FAIR standards**

- The Open Group, [Risk Taxonomy (O-RT) Standard, Version 3.0.1](https://pubs.opengroup.org/security/o-rt/). Definitions of Loss Event Frequency, Threat Event Frequency, Vulnerability, and the loss magnitude factors.
- The Open Group, [Open FAIR Body of Knowledge](https://www.opengroup.org/open-fair), including the Risk Analysis (O-RA) Standard, Version 2.0.1. The analysis process, the choice between estimating LEF directly or deriving it, and the control categories.
- The Open Group, [Open FAIR Risk Analysis Process Guide](https://pubs.opengroup.org/security/openfair-process-guide-v1.0/). Worked process steps and the PERT convention for calibrated estimates.
- John Linford (2020), ["Updates to the Open FAIR Body of Knowledge, Part 2"](https://blog.opengroup.org/2020/12/02/updates-to-the-open-fair-body-of-knowledge-part-2/), The Open Group Blog.
- [Open FAIR Model v2 reference sheet](https://quantar.tech/wp-content/uploads/2022/08/OPEN-FAIR-Model-V2.pdf) and the [FAIR and Open FAIR risk model guide](https://nhimg.org/fair-and-open-fair-risk-model-guide).

**Methods**

- Douglas W. Hubbard and Richard Seiersen (2023), [How to Measure Anything in Cybersecurity Risk, 2nd ed.](https://onlinelibrary.wiley.com/doi/book/10.1002/9781119892335), Wiley. Loss exceedance curves, risk tolerance curves, and calibrated estimation.
- D. G. Malcolm, J. H. Roseboom, C. E. Clark, and W. Fazar (1959), ["Application of a Technique for Research and Development Program Evaluation,"](https://doi.org/10.1287/opre.7.5.646) Operations Research 7(5): 646–669. The origin of the PERT estimate.

**Fonts:** [Inter](https://fonts.google.com/specimen/Inter) and [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono), used under the SIL Open Font License.

## Disclaimer

- The default scenarios are illustrative and don't represent any real firm.
- Open FAIR is a trademark of The Open Group. This project isn't affiliated with or endorsed by The Open Group, the FAIR Institute, or any author cited above.
- It's an educational tool, not security, insurance, or investment advice.

## Author

Patrick Lefler · Seeking Eureka

## License

MIT. See `LICENSE.md`.
