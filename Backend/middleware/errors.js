const notFound = (req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' })
}

const errorHandler = (error, req, res, next) => {
    if (res.headersSent) return next(error)

    console.error(JSON.stringify({
        level: 'error',
        requestId: req.id,
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    }))

    const status = Number(error.status) || 500
    res.status(status).json({
        success: false,
        message: status >= 500 && process.env.NODE_ENV === 'production'
            ? 'An unexpected server error occurred'
            : error.message
    })
}

export { notFound, errorHandler }
