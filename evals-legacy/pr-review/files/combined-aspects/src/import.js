exports.importProfile = text => { try { return JSON.parse(text); } catch { return {}; } };
