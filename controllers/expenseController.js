const Expense = require("../models/Expense");

// Add a new expense
exports.addExpense = async (req, res) => {
  try {
    const { date, category, description, amount, paidTo, beneficiaryMemberId } = req.body;

    // Member benefit categories that require beneficiaryMemberId but not description/paidTo
    const memberBenefitCategories = [
      "මරණ ප්‍රතිලාභ ගෙවීම්",
      "ක්ෂණික ප්‍රතිලාභ ගෙවීම්", 
      "මළවුන් රැගෙන යාමේ ගාස්තු",
      "ද්‍රව්‍ය ආධාර හිග",
      "කලත්‍රයාගේ දෙමව්පිය මරණ ප්‍රතිලාභ ගෙවීම්"
    ];

    // Service categories that require description but not paidTo
    const serviceCategories = [
      "කූඩාරම් හසුරුවීම - කම්කරු ගාස්තු",
      "පිඟන් නිකුත් කිරීම",
      "පුටු නිකුත් කිරීම",
      "බුෆේ සෙට් නිකුත් කිරීම",
      "ශබ්ද විකාශන හසුරුවීම",
      "විදුලි බිල්පත්"
    ];

    const isMemberBenefit = memberBenefitCategories.includes(category);
    const isService = serviceCategories.includes(category);

    // Validate required fields
    if (!date || !category || !amount) {
      return res.status(400).json({
        error: "Date, category, and amount are required"
      });
    }

    if (isMemberBenefit) {
      // For member benefit categories: require beneficiaryMemberId
      if (!beneficiaryMemberId || parseInt(beneficiaryMemberId) <= 0) {
        return res.status(400).json({
          error: "Beneficiary member ID is required for this category"
        });
      }
    } else if (isService) {
      // For service categories: require description only
      if (!description) {
        return res.status(400).json({
          error: "Description is required for this category"
        });
      }
    } else {
      // For other categories: require description and paidTo
      if (!description || !paidTo) {
        return res.status(400).json({
          error: "Description and paidTo are required for this category"
        });
      }
    }

    // Validate amount
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: "Amount must be a positive number"
      });
    }

    // Create new expense
    const expenseData = {
      date: new Date(date),
      category: category.trim(),
      amount: parseFloat(amount),
    };

    if (isMemberBenefit) {
      // For member benefit categories
      expenseData.beneficiaryMemberId = parseInt(beneficiaryMemberId);
    } else if (isService) {
      // For service categories: only description needed
      expenseData.description = description.trim();
    } else {
      // For other categories: both description and paidTo needed
      expenseData.description = description.trim();
      expenseData.paidTo = paidTo.trim();
    }

    const expense = new Expense(expenseData);

    await expense.save();

    res.status(201).json({
      success: true,
      message: "Expense added successfully",
      expense: {
        id: expense._id,
        date: expense.date,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        paidTo: expense.paidTo,
        beneficiaryMemberId: expense.beneficiaryMemberId,
        created_at: expense.created_at
      },
    });

  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).json({
      error: "An error occurred while adding the expense",
      details: error.message,
    });
  }
};

// Get expenses with pagination and filtering
exports.getExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, startDate, endDate } = req.query;

    // Build filter query
    let filter = {};
    
    if (category) {
      filter.category = category;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get expenses
    const expenses = await Expense.find(filter)
      .sort({ date: -1, created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalCount = await Expense.countDocuments(filter);

    // Calculate total amount
    const totalAmountResult = await Expense.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;

    res.status(200).json({
      success: true,
      expenses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        limit: parseInt(limit),
      },
      totalAmount,
    });

  } catch (error) {
    console.error("Error getting expenses:", error);
    res.status(500).json({
      error: "An error occurred while fetching expenses",
      details: error.message,
    });
  }
};

// Get expense summary by category
exports.getExpenseSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build filter query
    let filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }

    // Get summary by category
    const summary = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Get overall total
    const overallTotal = summary.reduce((total, item) => total + item.totalAmount, 0);

    res.status(200).json({
      success: true,
      summary,
      overallTotal,
    });

  } catch (error) {
    console.error("Error getting expense summary:", error);
    res.status(500).json({
      error: "An error occurred while fetching expense summary",
      details: error.message,
    });
  }
};

// Get a single expense by ID
exports.getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        error: "Expense not found"
      });
    }

    res.status(200).json({
      success: true,
      expense
    });

  } catch (error) {
    console.error("Error getting expense:", error);
    res.status(500).json({
      error: "An error occurred while fetching the expense",
      details: error.message,
    });
  }
};

// Update an expense
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, category, description, amount, paidTo, beneficiaryMemberId } = req.body;

    // Member benefit categories that require beneficiaryMemberId but not description/paidTo
    const memberBenefitCategories = [
      "මරණ ප්‍රතිලාභ ගෙවීම්",
      "ක්ෂණික ප්‍රතිලාභ ගෙවීම්", 
      "මළවුන් රැගෙන යාමේ ගාස්තු",
      "ද්‍රව්‍ය ආධාර හිග"
    ];

    // Service categories that require description but not paidTo
    const serviceCategories = [
      "කූඩාරම් හසුරුවීම - කම්කරු ගාස්තු",
      "පිඟන් නිකුත් කිරීම",
      "පුටු නිකුත් කිරීම",
      "බුෆේ සෙට් නිකුත් කිරීම",
      "ශබ්ද විකාශන හසුරුවීම",
      "විදුලි බිල්පත්"
    ];

    const isMemberBenefit = memberBenefitCategories.includes(category);
    const isService = serviceCategories.includes(category);

    // Validate required fields
    if (!date || !category || !amount) {
      return res.status(400).json({
        error: "Date, category, and amount are required"
      });
    }

    if (isMemberBenefit) {
      // For member benefit categories: require beneficiaryMemberId
      if (!beneficiaryMemberId || parseInt(beneficiaryMemberId) <= 0) {
        return res.status(400).json({
          error: "Beneficiary member ID is required for this category"
        });
      }
    } else if (isService) {
      // For service categories: require description only
      if (!description) {
        return res.status(400).json({
          error: "Description is required for this category"
        });
      }
    } else {
      // For other categories: require description and paidTo
      if (!description || !paidTo) {
        return res.status(400).json({
          error: "Description and paidTo are required for this category"
        });
      }
    }

    // Validate amount
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: "Amount must be a positive number"
      });
    }

    // Build update data
    const updateData = {
      date: new Date(date),
      category: category.trim(),
      amount: parseFloat(amount),
    };

    if (isMemberBenefit) {
      // For member benefit categories
      updateData.beneficiaryMemberId = parseInt(beneficiaryMemberId);
      // Clear other fields
      updateData.description = undefined;
      updateData.paidTo = undefined;
    } else if (isService) {
      // For service categories: only description needed
      updateData.description = description.trim();
      // Clear other fields
      updateData.beneficiaryMemberId = undefined;
      updateData.paidTo = undefined;
    } else {
      // For other categories: both description and paidTo needed
      updateData.description = description.trim();
      updateData.paidTo = paidTo.trim();
      // Clear other fields
      updateData.beneficiaryMemberId = undefined;
    }

    const expense = await Expense.findByIdAndUpdate(id, updateData, { new: true });

    if (!expense) {
      return res.status(404).json({
        error: "Expense not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      expense
    });

  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({
      error: "An error occurred while updating the expense",
      details: error.message,
    });
  }
};

// Delete an expense
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findByIdAndDelete(id);

    if (!expense) {
      return res.status(404).json({
        error: "Expense not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Expense deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({
      error: "An error occurred while deleting the expense",
      details: error.message,
    });
  }
};

// Get all expenses without pagination (for reports and views)
exports.getAllExpenses = async (req, res) => {
  try {
    const { category, startDate, endDate } = req.query;

    // Build filter query
    let filter = {};
    
    if (category) {
      filter.category = category;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }

    // Get all expenses without pagination
    const expenses = await Expense.find(filter)
      .sort({ date: -1, created_at: -1 });

    // Calculate total amount
    const totalAmountResult = await Expense.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;

    res.status(200).json({
      success: true,
      expenses,
      totalAmount,
      count: expenses.length
    });

  } catch (error) {
    console.error("Error getting all expenses:", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while fetching all expenses",
      details: error.message,
    });
  }
};
