function checkBodyMiddleware(requiredKeys) {
    return function(req, res, next) {
        const body = req.body;
        let isValid = true;
        let error = '';

        for (const key of requiredKeys) {
            if (!body.hasOwnProperty(key) || body[key] === '') {
                isValid = false;
                error = `Missing ${key}`;
                break;
            }

            if (key === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(body[key])) {
                    isValid = false;
                    error = 'Invalid email';
                    break;
                }
            }
        }

        if (isValid) {
            next();
        } else {
            res.status(400).json({ error: error });
        }
    };
}

module.exports = { checkBodyMiddleware };
