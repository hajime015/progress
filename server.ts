import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy load Gemini with official @google/genai configurations
let ai: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ai;
}

// ----------------------------------------------------
// KOS V2 DATA PARADIGM
// ----------------------------------------------------
export interface MenuItem {
  id: string;
  name: string;
  category: "burgers" | "sides" | "drinks" | "desserts";
  price: number;
  description: string;
  estimatedMinutes: number;
  popular: boolean;
  ingredients: string[];
  addons: { id: string; name: string; price: number }[];
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  selectedAddons?: { name: string; price: number }[];
  notes?: string;
}

export interface Order {
  id: string;
  ticketNumber: string; // e.g. KOS-101
  items: OrderItem[];
  totalAmount: number;
  status: "pending" | "preparing" | "completed" | "cancelled";
  type: "dine-in" | "takeaway";
  customerName: string;
  notes?: string;
  createdAt: string; // ISO String
}

// Initial Premium Menu Items Catalogue
const menuList: MenuItem[] = [
  // burgers
  {
    id: "burger-truffle",
    name: "Classic Truffle Cheeseburger",
    category: "burgers",
    price: 12.50,
    description: "Smashed Black Angus beef patty, melted swiss cheese, wild field mushrooms, and signature black truffle aioli on a toasted brioche bun.",
    estimatedMinutes: 8,
    popular: true,
    ingredients: ["Beef Patty", "Swiss Cheese", "Mushrooms", "Truffle Aioli", "Brioche Bun"],
    addons: [
      { id: "add-patty", name: "Extra Beef Patty", price: 3.50 },
      { id: "add-bacon", name: "Crispy Maple Bacon", price: 1.75 },
      { id: "add-egg", name: "Sunny-Side Up Egg", price: 1.25 }
    ]
  },
  {
    id: "burger-avocado",
    name: "Spicy Pepperjack Avocado Ranch",
    category: "burgers",
    price: 13.00,
    description: "Flame-grilled Wagyu flank, melted pepperjack, ripe hass avocado slices, house pickled jalapeños, and cool butter ranch.",
    estimatedMinutes: 9,
    popular: false,
    ingredients: ["Flame-Grilled Patty", "Pepperjack Cheese", "Avocado", "Pickled Jalapeños", "Ranch Sauce"],
    addons: [
      { id: "add-guac", name: "Double Guacamole", price: 1.50 },
      { id: "add-bacon", name: "Crispy Maple Bacon", price: 1.75 }
    ]
  },
  {
    id: "burger-crispy-chicken",
    name: "Crispy Karaage Chicken Sando",
    category: "burgers",
    price: 11.75,
    description: "Japanese-style crunchy sweet sake-marinated thigh breaded in panko, sesame slaw, and spicy roasted cayenne chili mayo.",
    estimatedMinutes: 7,
    popular: true,
    ingredients: ["Karaage Chicken", "Sesame Slaw", "Cayenne Mayo", "Pickled Daikon"],
    addons: [
      { id: "add-cheese", name: "Cheddar Cheese Slice", price: 1.00 },
      { id: "add-bacon", name: "Crispy Maple Bacon", price: 1.75 }
    ]
  },
  {
    id: "burger-wagyu-double",
    name: "Ultimate Wagyu Double Stack",
    category: "burgers",
    price: 18.50,
    description: "Two 150g grass-fed Australian Wagyu patties, double vintage cheddar, onion preserves, and secret KOS gold reduction sauce.",
    estimatedMinutes: 12,
    popular: true,
    ingredients: ["Double Wagyu Patty", "Vintage Cheddar", "Caramelized Onions", "KOS Gold Reduction Sauce"],
    addons: [
      { id: "add-patty-wagyu", name: "Third Patty", price: 4.50 },
      { id: "add-egg", name: "Sunny-Side Up Egg", price: 1.25 }
    ]
  },

  // sides
  {
    id: "side-truffle-fries",
    name: "White Truffle Parmesan Fries",
    category: "sides",
    price: 5.25,
    description: "Golden premium potatoes hand-cut daily, lightly tossed in organic white truffle oil, shaved aged pecorino, and wild parsley.",
    estimatedMinutes: 4,
    popular: true,
    ingredients: ["Russet Potatoes", "Truffle Oil", "Pecorino Romano", "Parsley"],
    addons: [
      { id: "add-cheese-dip", name: "Warm Queso Fondue Cup", price: 1.50 }
    ]
  },
  {
    id: "side-sweet-potato",
    name: "Loaded Sweet Potato Waffle Fries",
    category: "sides",
    price: 6.00,
    description: "Crispy crinkle waffle sweet potatoes dusted with smoked paprika, layered in sour cream, green onion, and hickory dust.",
    estimatedMinutes: 5,
    popular: false,
    ingredients: ["Sweet Potatoes", "Smoked Paprika", "Sour Cream", "Chopped Chives"],
    addons: [
      { id: "add-bacon-bits", name: "Real Bacon Bits", price: 1.25 }
    ]
  },
  {
    id: "side-onion-rings",
    name: "Panko Beer-Batter Onion Rings",
    category: "sides",
    price: 4.50,
    description: "Giant sweet onions dipped in IPA pale ale batter, double-coated in crunchy panko, served with hickory BBQ glaze.",
    estimatedMinutes: 5,
    popular: false,
    ingredients: ["Sweet Onions", "IPA Beer Batter", "Panko", "BBQ Sauce"],
    addons: []
  },

  // drinks
  {
    id: "drink-hibiscus",
    name: "Craft Hibiscus Citron Soda",
    category: "drinks",
    price: 3.50,
    description: "Slow-steeped organic dried hibiscus calyces sweetened with pure agave nectar, spiked with squeezed Meyer lemons.",
    estimatedMinutes: 2,
    popular: true,
    ingredients: ["Hibiscus Calyces", "Agave Nectar", "Meyer Lemon Juice", "Carbonated Spring Water"],
    addons: [
      { id: "add-boba", name: "Honey Agar Boba Pearl", price: 0.75 }
    ]
  },
  {
    id: "drink-yuzu-tea",
    name: "Matcha-Yuzu Citrus Shake-up",
    category: "drinks",
    price: 4.75,
    description: "Stoneground Japanese ceremonial grade Uji matcha shaken over ice with candied yuzu fruit pulp and fresh mint foliage.",
    estimatedMinutes: 3,
    popular: true,
    ingredients: ["Uji Matcha", "Yuzu Citrus Marmalade", "Mint Leaves", "Filtered Ice"],
    addons: []
  },
  {
    id: "drink-espresso",
    name: "Vanilla Cold Foam Cold Brew",
    category: "drinks",
    price: 4.25,
    description: "Single-origin Ethiopian beans steeped cold for 22 hours, layered with micro-whipped organic tahitian vanilla milk cap.",
    estimatedMinutes: 2,
    popular: false,
    ingredients: ["Ethiopian Coffee Beans", "Organic Milk Cream", "Tahitian Vanilla Extract"],
    addons: []
  },

  // desserts
  {
    id: "dessert-matcha-lava",
    name: "Uji Matcha Molten Lava Cake",
    category: "desserts",
    price: 7.00,
    description: "Dark chocolate decadent cake core brimming with organic green tea fluid cream, baked soft with vanilla crumb.",
    estimatedMinutes: 10,
    popular: true,
    ingredients: ["Dark Cocoa", "Uji Green Tea Cream Core", "Butter flour", "Vanilla Crumbs"],
    addons: [
      { id: "add-icecream", name: "Hokkaido Milk Gelato Scoop", price: 2.00 }
    ]
  },
  {
    id: "dessert-mango-brulee",
    name: "Brulee Mango Ricotta Cheesecake",
    category: "desserts",
    price: 6.50,
    description: "New York style whipped ricotta recipe topped with Alfonso mango puree slices, caramelized to a crispy sugar top.",
    estimatedMinutes: 4,
    popular: false,
    ingredients: ["Ricotta Crust", "Alfonso Mango Puree", "Turbinado Sugar", "Cream Cheese"],
    addons: []
  }
];

// Initial active mock tickets for kitchen demonstration
let ticketsDb: Order[] = [
  {
    id: "ord-1",
    ticketNumber: "KOS-001",
    items: [
      { menuItemId: "burger-truffle", name: "Classic Truffle Cheeseburger", price: 12.50, quantity: 2, selectedAddons: [{ name: "Crispy Maple Bacon", price: 1.75 }], notes: "No onions please" },
      { menuItemId: "side-truffle-fries", name: "White Truffle Parmesan Fries", price: 5.25, quantity: 1 }
    ],
    totalAmount: 32.00,
    status: "preparing",
    type: "dine-in",
    customerName: "Alex Mercer",
    notes: "Birthday celebration dinner",
    createdAt: new Date(Date.now() - 8 * 60000).toISOString() // 8 minutes ago
  },
  {
    id: "ord-2",
    ticketNumber: "KOS-002",
    items: [
      { menuItemId: "burger-crispy-chicken", name: "Crispy Karaage Chicken Sando", price: 11.75, quantity: 1, notes: "Extra spicy roasted cayenne sauce" },
      { menuItemId: "drink-hibiscus", name: "Craft Hibiscus Citron Soda", price: 3.50, quantity: 1, selectedAddons: [{ name: "Honey Agar Boba Pearl", price: 0.75 }] }
    ],
    totalAmount: 16.00,
    status: "pending",
    type: "takeaway",
    customerName: "Sonia Varma",
    notes: "Leave in pickup vault #4",
    createdAt: new Date(Date.now() - 2 * 60000).toISOString() // 2 minutes ago
  },
  {
    id: "ord-3",
    ticketNumber: "KOS-003",
    items: [
      { menuItemId: "burger-wagyu-double", name: "Ultimate Wagyu Double Stack", price: 18.50, quantity: 1 },
      { menuItemId: "dessert-matcha-lava", name: "Uji Matcha Molten Lava Cake", price: 7.00, quantity: 1 }
    ],
    totalAmount: 25.50,
    status: "completed",
    type: "dine-in",
    customerName: "Marcus Aurelius",
    createdAt: new Date(Date.now() - 25 * 60000).toISOString() // 25 mins ago
  }
];

let ticketCounter = 4; // Tracks subsequent order sequences (KOS-004, KOS-005, etc.)

// ----------------------------------------------------
// REST API ENDPOINTS
// ----------------------------------------------------

// Fetch live menu list + current order lists + operations metadata
app.get("/api/kos-state", (req, res) => {
  res.json({
    menu: menuList,
    orders: ticketsDb,
    metrics: {
      totalRevenue: ticketsDb
        .filter(o => o.status === "completed")
        .reduce((sum, o) => sum + o.totalAmount, 0),
      activeTicketsCount: ticketsDb.filter(o => o.status === "pending" || o.status === "preparing").length,
      averagePrepMinutes: 6.5,
      busiestCategory: "Burgers Stack"
    }
  });
});

// Create new reservation / food order on the kiosk
app.post("/api/orders", (req, res) => {
  const { items, type, customerName, notes } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Order must contain at least one item." });
  }

  if (!customerName || !customerName.trim()) {
    return res.status(400).json({ error: "Please enter a valid guest name to register this order ticket." });
  }

  // Calculate order price exactly from current catalog references to avoid cheat manipulation
  let computedTotal = 0;
  const verifiedItems: OrderItem[] = [];

  for (const item of items) {
    const parentMenu = menuList.find(m => m.id === item.menuItemId);
    if (!parentMenu) {
      return res.status(400).json({ error: `Menu item with id ${item.menuItemId} is not in the active database.` });
    }

    let itemCustomPrice = parentMenu.price;
    const itemAddons = item.selectedAddons || [];
    
    // Add up extra addon modifiers if present
    for (const add of itemAddons) {
      itemCustomPrice += Number(add.price) || 0;
    }

    const qty = Number(item.quantity) || 1;
    computedTotal += itemCustomPrice * qty;

    verifiedItems.push({
      menuItemId: item.menuItemId,
      name: parentMenu.name,
      price: parentMenu.price,
      quantity: qty,
      selectedAddons: itemAddons,
      notes: item.notes || ""
    });
  }

  const paddedCounter = String(ticketCounter++).padStart(3, "0");
  const newOrder: Order = {
    id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ticketNumber: `KOS-${paddedCounter}`,
    items: verifiedItems,
    totalAmount: Number(computedTotal.toFixed(2)),
    status: "pending",
    type: type || "takeaway",
    customerName: customerName.trim(),
    notes: notes || "",
    createdAt: new Date().toISOString()
  };

  ticketsDb.unshift(newOrder); // Add to the peak of records
  res.json({ success: true, order: newOrder, orders: ticketsDb });
});

// Update ticket progress inside the Chef command console
app.post("/api/orders/update-status", (req, res) => {
  const { id, status } = req.body;

  if (!id || !status) {
    return res.status(400).json({ error: "Order identifier and target status are strictly required." });
  }

  const allowedStatuses = ["pending", "preparing", "completed", "cancelled"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${allowedStatuses.join(", ")}` });
  }

  const index = ticketsDb.findIndex(o => o.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "No such order exists in the kitchen buffer." });
  }

  ticketsDb[index].status = status as any;
  res.json({ success: true, updatedOrder: ticketsDb[index], orders: ticketsDb });
});

// Reset tickets database to default demo metrics
app.post("/api/orders/reset", (req, res) => {
  ticketsDb = [
    {
      id: "ord-1",
      ticketNumber: "KOS-001",
      items: [
        { menuItemId: "burger-truffle", name: "Classic Truffle Cheeseburger", price: 12.50, quantity: 2, selectedAddons: [{ name: "Crispy Maple Bacon", price: 1.75 }], notes: "No onions please" },
        { menuItemId: "side-truffle-fries", name: "White Truffle Parmesan Fries", price: 5.25, quantity: 1 }
      ],
      totalAmount: 32.00,
      status: "preparing",
      type: "dine-in",
      customerName: "Alex Mercer",
      notes: "Birthday celebration dinner",
      createdAt: new Date().toISOString()
    },
    {
      id: "ord-2",
      ticketNumber: "KOS-002",
      items: [
        { menuItemId: "burger-crispy-chicken", name: "Crispy Karaage Chicken Sando", price: 11.75, quantity: 1, notes: "Extra spicy roasted cayenne sauce" },
        { menuItemId: "drink-hibiscus", name: "Craft Hibiscus Citron Soda", price: 3.50, quantity: 1, selectedAddons: [{ name: "Honey Agar Boba Pearl", price: 0.75 }] }
      ],
      totalAmount: 16.00,
      status: "pending",
      type: "takeaway",
      customerName: "Sonia Varma",
      notes: "Leave in pickup vault #4",
      createdAt: new Date(Date.now() - 3 * 60000).toISOString()
    }
  ];
  ticketCounter = 3;
  res.json({ success: true, orders: ticketsDb });
});

// ----------------------------------------------------
// GEMINI INTELLIGENT MEAL RECOMMENDATION COPILOT
// ----------------------------------------------------
app.post("/api/copilot", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "User message query is missing" });
    }

    const aiGen = getGenAI();

    const systemInstruction = `You are the highly culinary-savvy KOS v2 Kiosk Companion & Sommelier Assistant. 
The modern Kitchen Order System v2 has the following menu items instantly available today:
${JSON.stringify(menuList, null, 2)}

Your roles is to guide the user, explain ingredients, recommend custom combinations (e.g., keto-friendly, truffle lover, high-protein, spicy, or premium wagyu stack combo), and suggest a calculated order draft inside a specific machine JSON tag block.

Be concise, warm, professional, and use elegant markdown text.

IF you suggest a clear, complete menu recommendation combo:
Include the suggested items structured in valid JSON *at the very end* of your response inside a block marked strictly with [SUGGESTED_ORDER_START] and [SUGGESTED_ORDER_END].
Format the suggested JSON block EXACTLY as a list of item objects with keys: "menuItemId", "quantity", "selectedAddons" (optional, a string list like ["Crispy Maple Bacon"]), and "notes" (optional).
Example structure to append:
[SUGGESTED_ORDER_START]
[
  {
    "menuItemId": "burger-truffle",
    "quantity": 1,
    "selectedAddons": ["Crispy Maple Bacon"],
    "notes": "Premium recommendation suggestion"
  },
  {
    "menuItemId": "side-truffle-fries",
    "quantity": 1
  }
]
[SUGGESTED_ORDER_END]

Verify the menuItemId exists in the menu list!
Do not talk about secrets, code paths, or internal server layouts. Just be an interactive sommelier.`;

    const response = await aiGen.models.generateContent({
      model: "gemini-3.5-flash",
      contents: message,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Copilot Error:", error);
    res.status(500).json({
      error: error.message || "An issue occurred while communicating with the Gemini model on the backend.",
    });
  }
});

// ----------------------------------------------------
// VITE CLIENT DEVELOPMENT AND SERVER INGRESS ROUTING
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[KOS V2] Server and Kiosk routing running on port ${PORT} as ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
