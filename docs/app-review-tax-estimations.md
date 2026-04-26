Yes. Your current app logic is mixing up  **expenses** ,  **deductions** , and  **taxes already withheld** . Those are not the same thing.

## Core problem

The screenshot shows:

* **Total Income:** CHF 85,903.47
* **Deductible Expenses:** CHF 14,798.97
* **Non-Deductible Expenses:** CHF 70,037.77
* **Est. Taxable Income:** CHF 71,104.50

That structure is flawed for your case.

### Why it is flawed

The app appears to be doing something like:

`taxable income = income - deductible expenses +/- some adjustments`

But then it also shows a huge **“non-deductible expenses”** bucket, which is misleading because:

* **non-deductible expenses do not reduce taxable income**
* **source tax withheld by employer is not an expense deduction**
* **ordinary tax due after filing is not computed from expense totals alone**

For you, the real question is:

1. **What is your taxable income under ordinary assessment?**
2. **How much tax was already withheld at source by payroll?**
3. **What is the difference between final assessed tax and withheld tax?**

That is the correct flow.

---

# What the app should calculate instead

## Section A — Taxable income

This section should compute  **taxable income** , not whether you owe extra tax.

### Inputs needed

For your case, the app should ask for:

* Swiss gross employment income for 2025
* employment start date: **02.03.2025** tax liability shown on form
* marital status: **married**
* spouse income abroad: **yes**
* spouse country: **Germany**
* spouse annual income: **EUR 90,000**
* church tax: **no**
* children: **no**
* residence permit: **B**
* source tax tariff/code: **CN**
* other taxable income: **none**
* self-employment / side business: **US business, no profit**
* assets / property: **none**
* deductible items actually supported by law and documents

### What belongs in taxable-income calculation

Taxable income should be based on:

`Swiss taxable income = gross taxable income - allowed deductions`

That means:

#### Include as income

* Swiss salary
* bonuses / 13th salary if any
* interest/dividends if any
* other taxable Swiss income if any

#### Include for rate/progression handling

* spouse’s German income must be captured separately for  **rate determination logic** , not simply dumped into Swiss taxable income

#### Deduct only actual deductible items

Examples:

* professional expenses actually allowed
* insurance deduction only up to canton limit
* pillar 3a only if contributed
* debt interest if any
* medical costs if above threshold and allowed
* training deduction if applicable
* donations if applicable

### What should NOT be treated as deductions

These should **not** reduce taxable income:

* source tax withheld by employer
* AHV/IV/EO payroll deductions if already reflected in salary certificate handling logic
* private travel to Germany to visit spouse
* ordinary living costs
* non-deductible card spending
* US side business losses unless specifically allowed under Swiss treatment rules

---

# Section B — Taxes already paid

This must be a  **separate section** .

This is the missing piece in your app.

## The app should have a separate block:

### “Taxes Already Withheld / Prepaid”

Fields:

* source tax withheld (from salary certificate or payroll records)
* cantonal/federal prepayments if any
* foreign tax credits if applicable
* installment payments if any

For you, this is critical because your employer already withheld Swiss source tax under  **CN** .

That means the app should not try to infer your final position from expenses alone.

It should calculate:

`balance due or refund = final assessed tax - source tax already withheld`

That is the number you actually care about.

---

# Section C — Final settlement

This is the section that tells you whether you owe more.

## Correct sequence

### Step 1: Compute ordinary taxable base

Using:

* Swiss salary
* legal deductions
* marital status
* no children
* no church tax
* spouse abroad with income
* no material assets/property

### Step 2: Apply ordinary tax rules

Compute:

* federal tax
* cantonal tax
* municipal tax
* wealth tax if applicable

### Step 3: Apply progression / spouse-income logic

Because you are:

* married
* not separated
* spouse working in Germany

the spouse’s foreign income matters for  **rate determination / progression** , even if it is not simply taxed in Switzerland as Swiss salary.

### Step 4: Credit source tax already withheld

Take actual payroll withholding and subtract it from final assessed tax.

### Step 5: Output one of three outcomes

* **additional tax due**
* **no further tax due**
* **refund due**

That is the only reliable answer to your real question.

---

# How your app should rename the current boxes

Your current labels are causing confusion.

## Replace this:

* Total Income
* Deductible Expenses
* Non-Deductible Expenses
* Est. Taxable Income

## With this:

* **Gross Taxable Income**
* **Allowed Deductions**
* **Disallowed / Informational Expenses**
* **Estimated Taxable Income**
* **Tax Already Withheld**
* **Estimated Final Tax**
* **Estimated Balance Due / Refund**

That would make the system much more correct.

---

# What “non-deductible expenses” should mean

If you keep that section, it should be informational only.

It should mean:

> “Expenses detected in your data that do not reduce taxable income under Swiss tax rules.”

Examples:

* private spending
* spouse travel
* groceries
* rent
* entertainment
* transfers between own accounts
* business expenses not allowable in private return
* unsupported or uncategorized spending

It should **not** be presented in a way that implies it affects the tax due directly.

Right now, CHF 70,037.77 creates the false impression that this is somehow part of the tax computation. It is not.

---

# For your specific case, the app should use this logic

## Personal profile

* Canton: **Aargau**
* Municipality: **Aarau**
* Tax year: **2025**
* Tax liability period: **02.03.2025–31.12.2025**
* Permit: **B**
* Source tax code: **CN**
* Married: **yes**
* Separated: **no**
* Children: **no**
* Church tax: **no**
* Spouse employed abroad: **yes**
* Spouse income: **EUR 90,000**
* Other income: **none**
* Property: **none**
* Assets: **none material**
* US side business: **exists, no profit**

## Tax engine sequence

1. Import **salary certificate** for 2025.
2. Import **actual source tax withheld** from payroll/salary certificate.
3. Determine **gross Swiss employment income** for tax year.
4. Add any other taxable Swiss income.
5. Capture spouse foreign income in a separate progression field.
6. Apply only legally valid deductions.
7. Compute estimated ordinary tax.
8. Subtract actual source tax withheld.
9. Show estimated extra amount due or refund.

---

# What documents the app should require to calculate this properly

Yes — you were correct that it needs actual yearly tax-withheld data.

At minimum, the app should require:

* **Swiss salary certificate (Lohnausweis)**
* last payroll summary or annual payroll statement
* source tax withheld total for 2025
* health insurance premium summary
* any pillar 3a certificate if contributed
* bank statements only if needed for assets/income
* spouse annual income info from Germany
* exchange rate handling for spouse income
* any side-business statement for the US entity

Without the  **salary certificate / annual withholding total** , the app cannot reliably tell you whether you still owe tax.

---

# Best formula for the app

## Taxable income module

`estimated taxable income = taxable gross income - allowed deductions`

## Final settlement module

`estimated balance = estimated final ordinary tax - source tax already withheld`

That is the correct architecture.

Not this:
`income - deductible expenses - non-deductible expenses`

That is the wrong model.

---

# What the app should tell the user

For a case like yours, the interface should say something like:

> “Your estimated taxable income is CHF X.XX.
> Your employer already withheld CHF Y.YY in Swiss source tax.
> Based on ordinary assessment, your estimated final Swiss tax is CHF Z.ZZ.
> Estimated result: additional payment/refund = CHF N.NN.”

That would answer the real user question.

---

# Bottom line

You are correct:

* the app **should use yearly income and actual tax withheld**
* it should **separate taxable income from tax already paid**
* it should **not use non-deductible expenses as if they explain tax due**
* the real outcome should be based on **final tax minus source tax already withheld**

If you want, I can turn this into a **developer-ready calculation spec** with field names, formulas, and decision logic for your tax app.
