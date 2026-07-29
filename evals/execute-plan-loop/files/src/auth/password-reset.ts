"use strict";

function isPasswordResetExpired(reset, now = Date.now()) {
  return reset.expiresAt < now;
}

module.exports = { isPasswordResetExpired };
