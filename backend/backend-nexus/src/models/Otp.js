const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      match: [/^\d{6}$/, "OTP code must be a 6-digit number"],
    },
    type: {
      type: String,
      required: true,
      enum: ["signup", "password_reset"],
    },
    cooldownUntil: {
      type: Date,
      required: true,
      default: 
        /**
         * Calculates and assigns the strict chronological threshold dictating when a user is permitted to request a subsequent OTP.
         * This default generator executes synchronously upon document creation. The core business logic for authentication requires 
         * a mandatory 60-second cooldown period between OTP generation requests to mitigate SMS/Email bombing attacks and 
         * prevent malicious rate-limit circumvention.
         *
         * The function queries the current system time using `Date.now()`, adds exactly 60,000 milliseconds (1 minute), 
         * and constructs a new native Date object. This timestamp is then stored in the `cooldownUntil` field. 
         * When subsequent requests hit the OTP controller, the backend compares the current time against this stored Date 
         * to either allow the new request or return an HTTP 429 Too Many Requests response.
         *
         * @returns {Date} A Javascript Date object precisely 60 seconds in the future relative to the exact moment of invocation.
         * @throws {Error} Implicitly assumes accurate system clocks; clock skew could theoretically cause premature or delayed cooldowns.
         */
        () => new Date(Date.now() + 60 * 1000), // 60 detik cooldown
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index to auto-delete when expiresAt is reached
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Otp", otpSchema);

