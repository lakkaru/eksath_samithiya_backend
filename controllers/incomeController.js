const Income = require('../models/Income')
const MembershipPayment = require('../models/MembershipPayment')
const FinePayment = require('../models/FinePayment')

// Add new income
const addIncome = async (req, res) => {
  try {
    const { date, category, description, amount, source } = req.body
    
    // Validate required fields
    if (!date || !category || !amount) {
      return res.status(400).json({
        success: false,
        error: 'දිනය, ප්‍රවර්ගය සහ මුදල අවශ්‍ය වේ'
      })
    }

    // Validate amount
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'වලංගු මුදල් ප්‍රමාණයක් ඇතුලත් කරන්න'
      })
    }

    // Category-specific validation
    const serviceCategories = [
      'කූඩාරම් කුලිය',
      'පිඟන් කුලිය', 
      'පුටු කුලිය',
      'බුෆේ සෙට් කුලිය',
      'ශබ්ද විකාශන කුලිය'
    ]
    
    const donationCategories = [
      'වෙනත් සංවිධානවලින් පරිත්‍යාග',
      'පුද්ගලික පරිත්‍යාග',
      'රජයේ ආධාර'
    ]

    const financialCategories = [
      'බැංකු පොලී ආදායම'
    ]

    const otherCategories = [
      'වෙනත් ආදායම්',
      'විශේෂ ඉසව්'
    ]

    if (serviceCategories.includes(category) || financialCategories.includes(category) || otherCategories.includes(category)) {
      if (!description || !description.trim()) {
        return res.status(400).json({
          success: false,
          error: 'මෙම ප්‍රවර්ගය සඳහා විස්තරය අවශ්‍ය වේ'
        })
      }
    }

    if (donationCategories.includes(category)) {
      if (!source || !source.trim()) {
        return res.status(400).json({
          success: false,
          error: 'පරිත්‍යාග සඳහා ප්‍රභවය අවශ්‍ය වේ'
        })
      }
    }

    const newIncome = new Income({
      date: new Date(date),
      category,
      description: description || '',
      amount: parseFloat(amount),
      source: source || ''
    })

    await newIncome.save()

    res.status(201).json({
      success: true,
      message: 'ආදායම සාර්ථකව ඇතුලත් කරන ලදී',
      income: newIncome
    })

  } catch (error) {
    console.error('Error adding income:', error)
    res.status(500).json({
      success: false,
      error: 'ආදායම ඇතුලත් කිරීමේදී දෝෂයක් සිදුවිය'
    })
  }
}

// Get incomes with date range filter (includes all income sources)
const getIncomes = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query
    
    let dateFilter = {}
    
    // Date range filter
    if (startDate && endDate) {
      dateFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }

    // Get other incomes (service, financial, donations, etc.)
    let incomeFilter = { ...dateFilter }
    if (category && category !== 'all') {
      incomeFilter.category = category
    }

    const otherIncomes = await Income.find(incomeFilter)
      .sort({ date: -1 })
      .lean()

    // Add type field to other incomes
    const transformedOtherIncomes = otherIncomes.map(income => ({
      ...income,
      type: 'other'
    }))

    let allIncomes = [...transformedOtherIncomes]

    // Get membership payments summary (only if not filtering by other categories)
    if (!category || category === 'all' || category === 'සාමාජික ගාස්තු') {
      const membershipPayments = await MembershipPayment.find(dateFilter)
        .sort({ date: -1 })
        .lean()

      if (membershipPayments.length > 0) {
        const totalMembershipAmount = membershipPayments.reduce((sum, payment) => sum + payment.amount, 0)
        const membershipSummary = {
          _id: 'membership-summary',
          date: membershipPayments[0].date, // Latest payment date
          category: 'සාමාජික ගාස්තු',
          description: `සාමාජික ගෙවීම් සාරාංශය (${membershipPayments.length} ගෙවීම්)`,
          amount: totalMembershipAmount,
          source: 'සාමාජික ගෙවීම්',
          created_at: membershipPayments[0].createdAt,
          type: 'membership-summary'
        }
        allIncomes.push(membershipSummary)
      }
    }

    // Get fine payments summary (only if not filtering by other categories)
    if (!category || category === 'all' || category === 'දඩ මුදල්') {
      const finePayments = await FinePayment.find(dateFilter)
        .sort({ date: -1 })
        .lean()

      if (finePayments.length > 0) {
        const totalFineAmount = finePayments.reduce((sum, payment) => sum + payment.amount, 0)
        const fineSummary = {
          _id: 'fine-summary',
          date: finePayments[0].date, // Latest payment date
          category: 'දඩ මුදල්',
          description: `දඩ ගෙවීම් සාරාංශය (${finePayments.length} ගෙවීම්)`,
          amount: totalFineAmount,
          source: 'දඩ ගෙවීම්',
          created_at: finePayments[0].createdAt,
          type: 'fine-summary'
        }
        allIncomes.push(fineSummary)
      }
    }

    // Filter by specific category if requested
    let filteredIncomes = allIncomes
    if (category && category !== 'all') {
      filteredIncomes = allIncomes.filter(income => income.category === category)
    }

    // Sort by priority: membership summary first, fine summary second, then other incomes by date
    filteredIncomes.sort((a, b) => {
      // Priority order: membership-summary (1), fine-summary (2), other (3)
      const getPriority = (income) => {
        if (income.type === 'membership-summary') return 1
        if (income.type === 'fine-summary') return 2
        return 3
      }
      
      const priorityA = getPriority(a)
      const priorityB = getPriority(b)
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }
      
      // If same priority, sort by date (oldest first)
      return new Date(a.date) - new Date(b.date)
    })

    // Calculate total amount
    const totalAmount = filteredIncomes.reduce((sum, income) => sum + income.amount, 0)

    res.json({
      success: true,
      incomes: filteredIncomes,
      totalAmount,
      count: filteredIncomes.length
    })

  } catch (error) {
    console.error('Error fetching incomes:', error)
    res.status(500).json({
      success: false,
      error: 'ආදායම් ලබා ගැනීමේදී දෝෂයක් සිදුවිය'
    })
  }
}

// Get single income by ID
const getIncomeById = async (req, res) => {
  try {
    const { id } = req.params

    const income = await Income.findById(id)

    if (!income) {
      return res.status(404).json({
        success: false,
        error: 'ආදායම සොයා ගත නොහැක'
      })
    }

    res.json({
      success: true,
      income
    })

  } catch (error) {
    console.error('Error fetching income:', error)
    res.status(500).json({
      success: false,
      error: 'ආදායම ලබා ගැනීමේදී දෝෂයක් සිදුවිය'
    })
  }
}

// Update income
const updateIncome = async (req, res) => {
  try {
    const { id } = req.params
    const { date, category, description, amount, source } = req.body

    // Validate required fields
    if (!date || !category || !amount) {
      return res.status(400).json({
        success: false,
        error: 'දිනය, ප්‍රවර්ගය සහ මුදල අවශ්‍ය වේ'
      })
    }

    // Validate amount
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'වලංගු මුදල් ප්‍රමාණයක් ඇතුලත් කරන්න'
      })
    }

    // Category-specific validation (same as addIncome)
    const serviceCategories = [
      'කූඩාරම් කුලිය',
      'පිඟන් කුලිය', 
      'පුටු කුලිය',
      'බුෆේ සෙට් කුලිය',
      'ශබ්ද විකාශන කුලිය'
    ]
    
    const donationCategories = [
      'වෙනත් සංවිධානවලින් පරිත්‍යාග',
      'පුද්ගලික පරිත්‍යාග',
      'රජයේ ආධාර'
    ]

    const financialCategories = [
      'බැංකු පොලී ආදායම'
    ]

    const otherCategories = [
      'වෙනත් ආදායම්',
      'විශේෂ ඉසව්'
    ]

    if (serviceCategories.includes(category) || financialCategories.includes(category) || otherCategories.includes(category)) {
      if (!description || !description.trim()) {
        return res.status(400).json({
          success: false,
          error: 'මෙම ප්‍රවර්ගය සඳහා විස්තරය අවශ්‍ය වේ'
        })
      }
    }

    if (donationCategories.includes(category)) {
      if (!source || !source.trim()) {
        return res.status(400).json({
          success: false,
          error: 'පරිත්‍යාග සඳහා ප්‍රභවය අවශ්‍ය වේ'
        })
      }
    }

    const updatedIncome = await Income.findByIdAndUpdate(
      id,
      {
        date: new Date(date),
        category,
        description: description || '',
        amount: parseFloat(amount),
        source: source || ''
      },
      { new: true }
    )

    if (!updatedIncome) {
      return res.status(404).json({
        success: false,
        error: 'ආදායම සොයා ගත නොහැක'
      })
    }

    res.json({
      success: true,
      message: 'ආදායම සාර්ථකව යාවත්කාලීන කරන ලදී',
      income: updatedIncome
    })

  } catch (error) {
    console.error('Error updating income:', error)
    res.status(500).json({
      success: false,
      error: 'ආදායම යාවත්කාලීන කිරීමේදී දෝෂයක් සිදුවිය'
    })
  }
}

// Delete income
const deleteIncome = async (req, res) => {
  try {
    const { id } = req.params

    const deletedIncome = await Income.findByIdAndDelete(id)

    if (!deletedIncome) {
      return res.status(404).json({
        success: false,
        error: 'ආදායම සොයා ගත නොහැක'
      })
    }

    res.json({
      success: true,
      message: 'ආදායම සාර්ථකව මකා දමන ලදී'
    })

  } catch (error) {
    console.error('Error deleting income:', error)
    res.status(500).json({
      success: false,
      error: 'ආදායම මකා දැමීමේදී දෝෂයක් සිදුවිය'
    })
  }
}

// Get income statistics
const getIncomeStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    
    let matchFilter = {}
    if (startDate && endDate) {
      matchFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }

    const stats = await Income.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { total: -1 }
      }
    ])

    const totalIncome = stats.reduce((sum, stat) => sum + stat.total, 0)

    res.json({
      success: true,
      stats,
      totalIncome
    })

  } catch (error) {
    console.error('Error fetching income stats:', error)
    res.status(500).json({
      success: false,
      error: 'ආදායම් සංඛ්‍යාලේඛන ලබා ගැනීමේදී දෝෂයක් සිදුවිය'
    })
  }
}

module.exports = {
  addIncome,
  getIncomes,
  getIncomeById,
  updateIncome,
  deleteIncome,
  getIncomeStats
}
