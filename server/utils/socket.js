
let io;

const setSocketIO = (socketInstance) => {
    io = socketInstance;
};

const getSocketIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized!');
    }
    return io;
};

module.exports = {
    setSocketIO,
    getSocketIO,
};