import bcrypt from "bcryptjs";
import { pool } from "../db";

// Demo account used for the presentation
const DEMO_USER = {
  name: "Yassine",
  email: "yassine@smartwallet.test",
  password: "Demo1234!",
  currency: "MAD",
};

const DEFAULT_CATEGORIES = {
  income: ["Salary", "Freelance", "Gifts", "Other Income"],
  expense: [
    "Groceries",
    "Transportation",
    "Housing",
    "Entertainment",
    "Shopping",
    "Healthcare",
    "Bills",
    "Restaurants",
    "Other Expense",
  ],
};

type SeedTransaction = [category: string, amount: number, day: number, description: string, merchant?: string];

// offset 0 = current month, -1 = last month, -2 = two months ago
const MONTHS: { offset: number; income: SeedTransaction[]; expenses: SeedTransaction[] }[] = [
  {
    offset: -2,
    income: [["Salary", 9000, 1, "Monthly salary"]],
    expenses: [
      ["Housing", 1000, 2, "Rent share"],
      ["Bills", 280, 5, "Electricity and water"],
      ["Groceries", 520, 6, "Weekly groceries", "Marjane"],
      ["Groceries", 430, 15, "Weekly groceries", "Carrefour"],
      ["Groceries", 350, 24, "Weekly groceries", "BIM"],
      ["Transportation", 300, 3, "Tram monthly pass"],
      ["Transportation", 200, 18, "Taxi rides"],
      ["Entertainment", 300, 20, "Cinema and concert"],
      ["Restaurants", 180, 12, "Dinner with friends"],
      ["Shopping", 250, 22, "T-shirts", "Zara"],
      ["Healthcare", 200, 9, "Pharmacy"],
    ],
  },
  {
    offset: -1,
    income: [
      ["Salary", 9000, 1, "Monthly salary"],
      ["Freelance", 1200, 17, "Website project"],
    ],
    expenses: [
      ["Housing", 1000, 2, "Rent share"],
      ["Bills", 310, 5, "Electricity and water"],
      ["Groceries", 650, 4, "Monthly groceries", "Marjane"],
      ["Groceries", 480, 13, "Weekly groceries", "Carrefour"],
      ["Groceries", 470, 25, "Weekly groceries", "Marjane"],
      ["Transportation", 300, 3, "Tram monthly pass"],
      ["Transportation", 150, 21, "Taxi rides"],
      ["Entertainment", 400, 14, "Football match tickets"],
      ["Restaurants", 320, 19, "Birthday dinner"],
      ["Shopping", 600, 27, "Sneakers", "Decathlon"],
    ],
  },
  {
    offset: 0,
    income: [["Salary", 9000, 1, "Monthly salary"]],
    expenses: [
      ["Housing", 1000, 2, "Rent share"],
      ["Bills", 290, 5, "Electricity and water"],
      ["Groceries", 285, 4, "Groceries", "Marjane"],
      ["Groceries", 420, 10, "Weekly groceries", "Carrefour"],
      ["Groceries", 310, 17, "Weekly groceries", "BIM"],
      ["Transportation", 300, 3, "Tram monthly pass"],
      ["Transportation", 120, 9, "Taxi rides"],
      ["Transportation", 110, 16, "Train to Rabat"],
      ["Entertainment", 200, 11, "Cinema"],
      ["Restaurants", 150, 13, "Lunch with colleagues"],
      ["Shopping", 350, 15, "Headphones"],
      ["Healthcare", 120, 8, "Pharmacy"],
    ],
  },
];

const BUDGETS = { overall: 4000, Groceries: 1500, Transportation: 600 };

const SAVINGS_GOALS = [
  {
    name: "New laptop",
    target: 8000,
    targetMonthOffset: 6,
    contributions: [
      [1000, -2, 2, "Initial contribution"],
      [500, -1, 2, "Monthly saving"],
      [500, 0, 2, "Monthly saving"],
    ] as [number, number, number, string][],
  },
  {
    name: "Emergency fund",
    target: 10000,
    targetMonthOffset: null,
    contributions: [
      [800, -1, 20, "Freelance money"],
      [300, 0, 6, "Monthly saving"],
    ] as [number, number, number, string][],
  },
];

// Returns "YYYY-MM-DD" for a day in a month relative to today.
// In the current month the day never goes past today.
function dateIn(monthOffset: number, day: number): string {
  const today = new Date();
  const date = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  let safeDay = Math.min(day, lastDay);
  if (monthOffset === 0) safeDay = Math.min(safeDay, today.getDate());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${String(safeDay).padStart(2, "0")}`;
}

function monthStart(monthOffset: number): string {
  return dateIn(monthOffset, 1);
}

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Start from empty tables
    await client.query(`
      TRUNCATE ai_reports, savings_contributions, savings_goals, budgets,
        transactions, receipts, categories, users RESTART IDENTITY CASCADE
    `);

    // Default categories
    const categoryIds: Record<string, number> = {};
    for (const type of ["income", "expense"] as const) {
      for (const name of DEFAULT_CATEGORIES[type]) {
        const result = await client.query(
          "INSERT INTO categories (user_id, name, type) VALUES (NULL, $1, $2) RETURNING id",
          [name, type]
        );
        categoryIds[name] = result.rows[0].id;
      }
    }

    // Demo user
    const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);
    const userResult = await client.query(
      "INSERT INTO users (name, email, password_hash, currency) VALUES ($1, $2, $3, $4) RETURNING id",
      [DEMO_USER.name, DEMO_USER.email, passwordHash, DEMO_USER.currency]
    );
    const userId = userResult.rows[0].id;

    // One custom category for the demo user
    const customResult = await client.query(
      "INSERT INTO categories (user_id, name, type) VALUES ($1, $2, 'expense') RETURNING id",
      [userId, "Gym"]
    );
    categoryIds["Gym"] = customResult.rows[0].id;

    // Transactions and budgets for each month
    let transactionCount = 0;
    for (const month of MONTHS) {
      const all = [
        ...month.income.map((t) => ["income", ...t] as const),
        ...month.expenses.map((t) => ["expense", ...t] as const),
        ["expense", "Gym", 250, 7, "Gym membership"] as const,
      ];

      for (const [type, category, amount, day, description, merchant] of all) {
        await client.query(
          `INSERT INTO transactions (user_id, category_id, type, amount, date, description, merchant)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, categoryIds[category], type, amount, dateIn(month.offset, day), description, merchant ?? null]
        );
        transactionCount++;
      }

      await client.query(
        "INSERT INTO budgets (user_id, category_id, month, amount_limit) VALUES ($1, NULL, $2, $3)",
        [userId, monthStart(month.offset), BUDGETS.overall]
      );
      for (const category of ["Groceries", "Transportation"] as const) {
        await client.query(
          "INSERT INTO budgets (user_id, category_id, month, amount_limit) VALUES ($1, $2, $3, $4)",
          [userId, categoryIds[category], monthStart(month.offset), BUDGETS[category]]
        );
      }
    }

    // Savings goals and contributions
    for (const goal of SAVINGS_GOALS) {
      const goalResult = await client.query(
        "INSERT INTO savings_goals (user_id, name, target_amount, target_date) VALUES ($1, $2, $3, $4) RETURNING id",
        [userId, goal.name, goal.target, goal.targetMonthOffset === null ? null : monthStart(goal.targetMonthOffset)]
      );
      const goalId = goalResult.rows[0].id;

      for (const [amount, offset, day, note] of goal.contributions) {
        await client.query(
          "INSERT INTO savings_contributions (goal_id, amount, date, note) VALUES ($1, $2, $3, $4)",
          [goalId, amount, dateIn(offset, day), note]
        );
      }
    }

    await client.query("COMMIT");

    console.log("Seed done:");
    console.log(`- ${Object.keys(categoryIds).length} categories`);
    console.log(`- 1 demo user (${DEMO_USER.email})`);
    console.log(`- ${transactionCount} transactions over ${MONTHS.length} months`);
    console.log(`- ${MONTHS.length * 3} budgets`);
    console.log(`- ${SAVINGS_GOALS.length} savings goals`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
