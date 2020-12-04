const User = require('../../models/user');
const mongoose = require('mongoose');
const Joi = require('@hapi/joi');
exports.register = async ctx => {
    const schema = Joi.object().keys({
        username: Joi.string()
            .alphanum()
            .min(3)
            .max(20)
            .required(),
        password: Joi.string().required(),
    });

    const result = schema.validate(ctx.request.body);
    if (result.error) {
        ctx.status = 400;
        ctx.body = result.error;
        return;
    }

    const { username, password } = ctx.request.body;
    try {
        const exists = await User.findByUsername(username);
        if (exists) {
            ctx.status = 409;
            return;
        }

        const user = new User({
            username,
        });

        await user.setPassword(password);
        await user.save();

        const data = user.toJSON();
        delete data.hashedPassword;
        ctx.body = data;

        const token = user.generateToken();
        ctx.cookies.set('access_token', token, {
            maxAge: 1000 * 60 * 60 * 24 * 7,
            httpOnly: true,
        });
    } catch (e) {
        ctx.throw(500, e);
    }
}

exports.login = async ctx => {
    const { username, password } = ctx.request.body;

    if (!username || !password) {
        ctx.status = 401;
        return;
    }

    try {
        const user = await User.findByUsername(username);
        if (!user) {
            ctx.status = 401;
            return;
        }
        const valid = await user.checkPassword(password);
        if (!valid) {
            ctx.status = 401;
            return;
        }
        const data = user.toJSON();
        delete data.hashedPassword;
        ctx.body = data;

        const token = user.generateToken();
        ctx.cookies.set('access_token', token, {
            maxAge: 1000 * 60 * 60 * 24 * 7,
            httpOnly: true,
        });
    } catch (e) {
        ctx.throw(500, e);
    }
}

exports.check = async ctx => {
    const { user } = ctx.state;
    if (!user) {
        ctx.status = 401;
        return;
    }
    ctx.body = user;
}

exports.logout = async ctx => {
    ctx.cookies.set('access_token');
    ctx.status = 204;
}