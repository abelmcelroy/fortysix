const chalk = require('chalk')
const { History } = require('../db/models')

const {
  generateRandomNumbers,
  sumRandomNumbers
} = require('../modules/randomLargeSum')

const travellingSalesman = require('../modules/travellingSalesman')

// constants for job names
const HUGE_SUM = 'HUGE_SUM'
const TRAVELLING_SALESMAN = 'TRAVELLING_SALESMAN'

const rooms = {}
let finalResult = {
  tour: '',
  dist: Infinity
}

const getRoom = (object = {}) => {
  return object || {}
}

module.exports = (io) => {

  io.on('connection', (socket) => {
    console.log(`A socket connection to the server has been made: ${socket.id}`)

    // General purpose
    socket.on('join', (room) => {
      socket.join(room)
      if (!rooms[room]) {
        rooms[room] = {
          start: null,
          jobRunning: false,
          nodes: { [socket.id]: { running: false, error: false } }
        }
      } else {
        rooms[room] = {
          jobRunning: rooms[room].jobRunning,
          nodes: {
            ...rooms[room].nodes,
            [socket.id]: { running: false, error: false }
          }
        }
      }

      // General purpose
      socket.once('disconnect', () => {
        delete rooms[room].nodes[socket.id]
        socket.leave(room)
        io.sockets.emit('UPDATE_' + room, getRoom(rooms[room]))
      })
      io.sockets.emit('UPDATE_' + room, getRoom(rooms[room]))
    })

    // General purpose
    socket.on('leave', (room) => {
      socket.leave(room)
      delete rooms[room].nodes[socket.id]
      io.sockets.emit('UPDATE_' + room, getRoom(rooms[room]))
    })

    socket.on('start', (room) => {
      console.log(chalk.green('STARTING: ') + room, socket.id, room)
    })

    socket.on('done', (room) => {
      rooms[room].nodes[socket.id].running = false
      const allDone =
        Object.keys(rooms[room].nodes)
          .every(socketId => rooms[room].nodes[socketId].running === false)

      if (allDone) {
        const endTime = Date.now()
        console.log(
          chalk.green(`DURATION OF ${room}: `, endTime - rooms[room].start)
        )

        console.log(
          chalk.magenta(`FINAL RESULT ${finalResult.tour} ${finalResult.dist}`)
        )

        io.sockets.emit('UPDATE_' + room, getRoom(rooms[room]))

        History.create({
          nodes: Object.keys(rooms[room].nodes).length,
          result: finalResult.tour + ' ' + finalResult.dist,
          startTime: rooms[room].start,
          endTime,
          room
        })
          .then(() => {
            History.findAll({ where: { room } }).then((history) => {
              io.sockets.emit('UPDATE_HISTORY_' + room, history)
            })
          })

        rooms[room].jobRunning = false
        rooms[room].start = null
        finalResult = {
          tour: '',
          dist: Infinity
        }
      }


      io.sockets.emit('UPDATE_' + room, getRoom(rooms[room]))
      console.log(chalk.green('DONE: '), socket.id, room)
    })

    socket.on('REQUEST_ROOM', (room) => {
      socket.emit('UPDATE_' + room, getRoom(rooms[room]))
    })

    socket.on('JOB_ERROR', (room) => {
      rooms[room].nodes[socket.id].running = false
      rooms[room].nodes[socket.id].error = true
      io.sockets.emit('UPDATE_' + room, getRoom(rooms[room]))
      console.log(chalk.red('JOB_ERROR: ') + `${room} for socket: ${socket.id}`)
    })

    jobInit(HUGE_SUM, socket, io, (io, room) => {
      const socketsInRoom = io.sockets.adapter.rooms[HUGE_SUM].sockets
      Object.keys(socketsInRoom).forEach((id) => {
        io.sockets.sockets[id].emit('CALL_' + room, 13)
      })
    })

    jobInit(TRAVELLING_SALESMAN, socket, io, travellingSalesman.partition)

    socket.on('result', (result) => {
      if(finalResult.dist > result[1]){
        finalResult.tour = result[0]
        finalResult.dist = result[1]
      }

      console.log('result: ', result)
      console.log('running best: ', finalResult)
    })
  })
}


function jobInit(room, socket, io, partition) {
  const startName = 'START_' + room

  socket.on(startName, (args) => {
    rooms[room].start = Date.now()
    rooms[room].jobRunning = true

    Object.keys(rooms[room].nodes).forEach((socketId) => {
      rooms[room].nodes[socketId].running = true
      rooms[room].nodes[socketId].error = false
    })

    io.sockets.emit('UPDATE_' + room, getRoom(rooms[room]))

    if (rooms[room]) {
      if (!rooms[room].running) {
        rooms[room].running = true
        partition(io, room, args)
        rooms[room].running = false
      } else {
        console.log(chalk.red(`${startName} already running!`))
      }
    } else {
      console.log(chalk.red(`${startName} attempted without nodes`))
    }
  })
}
