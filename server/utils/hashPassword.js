const bcrypt = require('bcrypt');

const saltRounds = 12;

const hashPassword = async (plainPassword) => {
    return bcrypt.hash(plainPassword, saltRounds);
};
const comparePassword = async (plainPassword, hashedPassword) => {
    return bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = {
    hashPassword,
    comparePassword,
};
