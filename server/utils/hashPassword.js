// Password hashing placeholder
const bcrypt = require('bcrypt');
const hashedPassword = async (plainPassword) => {
    return await bcrypt.hash(plainPassword, 12);
};
const comparePassword = async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
};
module.exports = {
    hashedPassword,
    comparePassword
};
