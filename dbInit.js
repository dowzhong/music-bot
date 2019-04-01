require('dotenv').config()

const Sequelize = require('sequelize')

const sequelize = new Sequelize('database', process.env.DBUSER, process.env.DBPASS, {
    host: 'localhost',
    dialect: 'sqlite', 
    operatorAliases: false,
    logging: false,
    storage: './database.sqlite'
})


const Guild = sequelize.define('guild', {
    id: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    userMaxSongs: {
        type: Sequelize.INTEGER,
        allowNull: false,
        default: 5
    }
})

sequelize.sync({ force: true })
    .then(() => {
        console.log('Database synced')
        sequelize.close()
    })