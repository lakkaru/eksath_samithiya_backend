const mongoose = require('mongoose')

const incomeSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      // === සේවා ආදායම (Service Income) ===
      'කූඩාරම් කුලිය',
      'පිඟන් කුලිය', 
      'පුටු කුලිය',
      'බුෆේ සෙට් කුලිය',
      'ශබ්ද විකාශන කුලිය',
      
      // === මූල්‍ය ආදායම (Financial Income) ===
      'බැංකු පොලී ආදායම',
      'බැංකු මුදල් ආපසු ගැනීම',
      'අවමංගල්‍යයක් සඳහා අතිරේක ආධාර',
      
      // === පරිත්‍යාග (Donations) ===
      'වෙනත් සංවිධානවලින් පරිත්‍යාග',
      'පුද්ගලික පරිත්‍යාග',
      'රජයේ ආධාර',
      
      // === අනෙකුත් ආදායම් (Other Income) ===
      'වෙනත් ආදායම්',
      'විශේෂ ඉසව්'
    ]
  },
  description: {
    type: String,
    required: function() {
      // සේවා ආදායම් - Service Income Categories (Description Required)
      const serviceCategories = [
        'කූඩාරම් කුලිය',
        'පිඟන් කුලිය', 
        'පුටු කුලිය',
        'බුෆේ සෙට් කුලිය',
        'ශබ්ද විකාශන කුලිය'
      ]
      
      // මූල්‍ය සහ අනෙකුත් ආදායම් - Financial & Other Categories (Description Required)
      const otherRequiredCategories = [
        'බැංකු පොලී ආදායම',
        'බැංකු මුදල් ආපසු ගැනීම',
        'අවමංගල්‍යයක් සඳහා අතිරේක ආධාර',
        'වෙනත් ආදායම්',
        'විශේෂ ඉසව්'
      ]
      
      return serviceCategories.includes(this.category) || otherRequiredCategories.includes(this.category)
    }
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  source: {
    type: String,
    required: function() {
      // පරිත්‍යාග ප්‍රවර්ග - Donation Categories (Source Required)
      const donationCategories = [
        'වෙනත් සංවිධානවලින් පරිත්‍යාග',
        'පුද්ගලික පරිත්‍යාග',
        'රජයේ ආධාර'
      ]
      return donationCategories.includes(this.category)
    }
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

// Index for better query performance
incomeSchema.index({ date: 1 })
incomeSchema.index({ category: 1 })

module.exports = mongoose.model('Income', incomeSchema)
