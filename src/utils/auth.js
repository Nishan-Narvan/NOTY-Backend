const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtokens');

const JWT_SECRET = process.env.JWT_SECRET || ''


const hashPassword = async (password) => {
    const saltrounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

// compare a password with its hash

const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};


const generateToken = (user) => {
    return jwt.sign({
        id: user.id,
        email: user.email
    },
    JWT_SECRET,
    {
        expiresIn: '7d'
    }
);
};


const verifyToken =(token) => {
    return jwt.verify(token, JWT_SECRET);
};


module.exports = {
    hashPassword,comparePassword,generateToken,verifyToken
};