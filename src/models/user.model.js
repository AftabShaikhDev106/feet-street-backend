const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    profile: {
      fullName: String,
      phoneNumber: String,
      address: String,
      city: String,
      state: String,
      pincode: String,
      profileImage: String,
    },
    wallet: {
      balance: {
        type: Number,
        default: 0,
      },
      transactions: [
        {
          amount: Number,
          type: {
            type: String,
            enum: ['credit', 'debit'],
          },
          description: String,
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    wishlist: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);