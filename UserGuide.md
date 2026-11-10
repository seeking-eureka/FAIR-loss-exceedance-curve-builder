# FAIR Loss Exceedance Curve Builder: A Plain-English Guide

## The Big Idea

Most boards see cyber risk shown as a heat map with red, yellow, and green boxes. But a heat map doesn't answer the two questions boards really care about: "How much could we lose in a year?" and "Is that more risk than we're willing to accept?"

This app answers both questions in dollars. It uses a standard method called Open FAIR (Factor Analysis of Information Risk) from The Open Group. FAIR splits each cyber risk into two parts:

| Part | Plain question | Example |
|---|---|---|
| How often | How many times a year will this hurt us? | Ransomware gets through about once every four or five years. |
| How much | When it happens, what does it cost? | About $2.5M, counting downtime, recovery, fines, and lawsuits. |

No one knows these numbers for sure, so every input is a range: a low guess, a most likely guess, and a high guess.

## How the App Thinks

The app acts like a flight simulator, but for years of possible losses.

1. List the risks. Six sample scenarios are included, such as ransomware, a customer data breach, and an outage at a key cloud vendor.
2. Roll the dice. The app simulates one year, picking how many times each event happens and what each one costs. In a quiet year, there may be no losses. In a bad year, there could be both a breach and a ransomware attack.
3. Repeat this 100,000 times. This creates 100,000 possible years, ranging from calm to terrible.
4. Count how often losses go over $1M, $5M, or $20M in those years.

## Reading the Screen

- **Scenario Register:** The list of risks and their ranges. Click any scenario to open and edit it.
- **Risk Appetite:** These are the board's limits. By default: no more than a 60% chance of losing over $1M in a year, 10% for over $5M, and 1% for over $20M.
- **Loss Exceedance Curve:** This is the main chart. Choose any dollar amount on the bottom axis. The height of the green curve shows the chance of losing more than that amount in a year. The gold dots show the board's limits. If the curve goes above a gold dot, that limit is broken.
- **Annualized Loss by Scenario:** Which risks cost the most on average.
- **Control Under Evaluation.** This is a proposed security investment, its yearly cost, and what it changes. The blue dashed curve shows the risk if the control is used.
- **The slider and Play.** Watch the results become more stable as the number of runs grows from 100 to 100,000 years.

## A Story in Three Moments

At 100 simulated years, the chance of losing more than $5M looks like 16%, but the margin of error is about 9% to 23%. This crosses the 10% limit, so the app says "Too close to call." The first lesson is that a small simulation can be very wrong.

At 100,000 years, the answer becomes stable. The average yearly loss is about $2.3M. In a 1-in-100 bad year, the loss is about $13M. The chance of losing more than $5M is 12.9%, which is above the 10% limit. The firm is outside its risk appetite.

With the control switched on, the proposal is immutable backups and better endpoint detection for $150K a year. This cuts both the chance and cost of ransomware by 40%. The average yearly loss drops by about $337K, which is more than twice the cost. The chance of losing more than $5M falls to 9.5%. The firm is back within its risk appetite.

The board gets a clear choice: a $150K investment that pays for itself and fixes a broken limit.

## Things to Try

- Set the slider to 100 and press "Re-run with new seed" a few times. Watch how the $5M answer moves around the limit.
- Lower the control's Vulnerability reduction until the $5M dot turns red again. This shows the minimum the control must achieve.
- Raise the data breach's high-end secondary loss from $15,000K to $40,000K. The average yearly loss goes up by about 18%, but the 1-in-100 year loss jumps from about $13M to $22M. The highest guesses cause the worst years.
- Switch the chart to Log to see rare, very large losses more clearly.

## Questions to Ask Your Risk Team

- Which of our limits are we breaking today, and by how much?
- Where did the low, most likely, and high guesses come from? Who made them, and were they trained to estimate?
- Which one or two scenarios drive our worst years?
- For each proposed security spend, how much does it lower expected loss, and does it bring us back within appetite?

## Limits to Keep in Mind

- It's a teaching tool. The scenarios are sample data, not a real firm's risks.
- Garbage in, garbage out. The answers are only as good as the ranges you enter. The highest guesses matter most.
- Risks are treated as independent, but in reality, one event can trigger another. For example, a ransomware attack can also cause a data breach, so bad years may be worse than shown.
- No insurance yet. Cyber insurance, which would reduce the highest losses, is planned for version 2.
- Open FAIR is a trademark of The Open Group. This app isn't affiliated with or endorsed by them.
