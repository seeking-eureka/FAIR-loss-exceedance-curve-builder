# FAIR Loss Exceedance Curve Builder: A Plain-English Guide

## The Big Idea

Most boards hear about cyber risk as a heat map: a grid of red, yellow, and green boxes. A heat map can't answer the two questions a board actually needs answered: **"How much could we lose in a year?"** and **"Is that more risk than we're willing to accept?"**

This app answers both in dollars. It uses a standard method called **Open FAIR** (Factor Analysis of Information Risk), published by The Open Group. FAIR breaks every cyber risk into two parts:

| Part | Plain question | Example |
|---|---|---|
| How often | How many times a year will this hurt us? | Ransomware gets through about once every four or five years. |
| How much | When it happens, what does it cost? | About $2.5M, counting downtime, recovery, fines, and lawsuits. |

Nobody knows these numbers exactly, so every input is a range: a low guess, a most likely guess, and a high guess.

## How the App Thinks

The app works like a flight simulator for loss years.

1. **List the risks.** Six sample scenarios are included, such as ransomware, a customer data breach, and an outage at a key cloud vendor.
2. **Roll the dice.** The app plays out one year, drawing how many of each event happens and what each one costs. A quiet year might cost nothing. A bad one might see a breach and a ransomware attack in the same year.
3. **Repeat 100,000 times.** That gives 100,000 possible years, from calm to awful.
4. **Count.** In what share of those years did losses pass $1M? $5M? $20M?

## Reading the Screen

- **Scenario Register.** The list of risks and their ranges. Click any scenario to open and edit it.
- **Risk Appetite.** The board's limits. The defaults say: no more than a 60% chance of losing over $1M in a year, 10% for over $5M, and 1% for over $20M.
- **Loss Exceedance Curve.** The main chart. Pick any dollar amount on the bottom axis. The height of the green curve shows the chance of losing more than that in a year. The gold dots are the board's limits. **If the curve passes above a gold dot, that limit is broken.**
- **Annualized Loss by Scenario.** Which risks cost the most on average.
- **Control Under Evaluation.** A proposed security investment, its yearly cost, and what it changes. The blue dashed curve shows the risk with the control in place.
- **The slider and Play.** Watch the answer settle as the run count grows from 100 to 100,000 years.

## A Story in Three Moments

**At 100 simulated years.** The chance of losing more than $5M looks like 16%, but the margin of error runs from about 9% to 23%. That straddles the 10% limit, so the app says **"Too close to call."** This is the first lesson: a small simulation can be badly wrong.

**At 100,000 years.** The answer settles. Average yearly loss is about **$2.3M**. A 1-in-100 bad year costs about **$13M**. The chance of losing more than $5M is **12.9%**, above the 10% limit. **The firm is outside its risk appetite.**

**With the control switched on.** The proposal is immutable backups plus better endpoint detection, at $150K a year. It cuts ransomware's chance of success and its cost by 40% each. Average yearly loss falls by about **$337K**, more than twice the cost. The chance of losing more than $5M drops to **9.5%**. **The firm is back inside appetite.**

The board gets a clear decision: a $150K investment that pays for itself and fixes a broken limit.

## Things to Try

- Set the slider to 100 and press "Re-run with new seed" a few times. Watch the $5M answer jump around the limit.
- Lower the control's Vulnerability reduction until the $5M dot turns red again. That's the least the control must achieve.
- Raise the data breach's high-end secondary loss from $15,000K to $40,000K. Average yearly loss rises about 18%, but the 1-in-100 year loss jumps from about $13M to $22M. **The high guesses drive the worst years.**
- Switch the chart to Log to see the rare, very large losses clearly.

## Questions to Ask Your Risk Team

- Which of our limits are we breaking today, and by how much?
- Where did the low, most likely, and high guesses come from? Who made them, and were they trained to estimate?
- Which one or two scenarios drive our worst years?
- For each proposed security spend, how much does it lower expected loss, and does it bring us back within appetite?

## Limits to Keep in Mind

- **It's a teaching tool.** The scenarios are sample data, not a real firm's risks.
- **Garbage in, garbage out.** The answers are only as good as the ranges. The high guesses matter most.
- **Risks are treated as independent.** In reality, one event can trigger another. A ransomware attack can also become a data breach, so bad years may be worse than shown.
- **No insurance yet.** Cyber insurance, which would cut the top of the loss range, is planned for version 2.
- **Open FAIR is a trademark of The Open Group.** This app isn't affiliated with or endorsed by them.
