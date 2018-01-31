const chalk = require('chalk')
const {
  History,
  Room,
  Selections,
  Parameters,
  Mutations
} = require('../db/models')
const { RoomManager } = require('../utils/room')
const { generateTasks } = require('../utils/tasks')

// constants for job names
const TOGGLE_MULTITHREADED = 'TOGGLE_MULTITHREADED'

const rooms = {}

const getRoom = (object = {}) => {
  return object || {}
}

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`A socket connection to the server has been made: ${socket.id}`)
    registerJoinAdmin(socket, io)
    registerEvents(socket, io)
  })
}

function registerJoinAdmin(socket, io) {
  socket.on('ADMIN_JOIN', (room) => {
    jobInit(
      room,
      socket,
      io
    )
  })
}

function jobInit(room, socket, io) {
  const startName = 'START_' + room
  socket.on(startName, (args) => {
    if (!rooms[room]) throw new Error(chalk.red(`${room} doesn't exist!`))
    rooms[room].jobInit(socket, io, args)
  })
}

function registerEvents(socket, io) {
  registerJoin(socket, io)
  registerLeave(socket, io)
  registerStart(socket, io)
  registerDone(socket, io)
  registerRequestRoom(socket, io)
  registerAbort(socket, io)
  registerJobError(socket, io)
}

// when a specific client gets an error
function registerJobError(socket, io) {
  socket.on('JOB_ERROR', ({ roomHash, error }) => {
    rooms[roomHash].jobError(socket, io, error)
  })
}

// abort event gets triggered when when the client side reset button is hit
function registerAbort(socket, io) {
  socket.on('ABORT', room => rooms[room].abort(io))
}

// when a contributor enters a room, a new in memory room is created (or an existing in memory room is updated with a new node)
function registerJoin(socket, io) {
  socket.on('join', (room) => {
    if (!rooms[room]) rooms[room] = new RoomManager(room, socket)
    rooms[room].join(socket)

    // if a socket disconnects, we take that node off the room's list of nodes
    socket.once('disconnect', () => {
      rooms[room].leave(socket)
      io.sockets.emit('UPDATE_' + room, getRoom(rooms[room]))
    })
    io.sockets.emit('UPDATE_' + room, getRoom(rooms[room]))
  })
}

function registerRequestRoom(socket) {
  socket.on('REQUEST_ROOM', (room) => {
    socket.emit('UPDATE_' + room, getRoom(rooms[room]))
  })
}

function registerLeave(socket, io) {
  socket.on('leave', (room) => {
    rooms[room].leave(socket)
    io.sockets.emit('UPDATE_' + room, getRoom(rooms[room]))
  })
}

function registerStart(socket) {
  socket.on('start', (room) => {
    console.log(chalk.green('STARTING: '), socket.id, room)
  })
}

function registerDone(socket, io) {
  socket.on('done', finishedTask => doneCallback(finishedTask, socket, io))
}

function doneCallback(finishedTask, socket, io) {
  // a bit of a security check --  might signal a malicious behavior
  if (finishedTask.fitnesses && finishedTask.fitnesses.length < 1) throw Error()

  /*
  updated control flow:
  1. update room statistics (total fitnesses & chromosomes returned)
  2. Update bucket
  3. check all done
    all done === (a) the bucket at the max generation exists AND
                 (b) the bucket at the max generation is greater than or equal to full
    3.1 if all done and jobRunning, call finalSelection, call algorithmDone w/ results
    3.2 if not all done and jobRunning, call createTask

    see below:
  */

  rooms[finishedTask.room].updateRoomStats(finishedTask)
  rooms[finishedTask.room].updateBucket(finishedTask)
  const allDone = rooms[finishedTask.room].shouldTerminate()

  // Avoid pushing history multiple times by checking jobRunning
  // if termination condition is met and the alg is still running..

  // the code below could be encapsulated in a direct traffic func on the instance
  // rooms[finishedTask.room].directTraffic()

  if (allDone) {
    const results = rooms[finishedTask.room].finalSelection()
    algorithmDone(results.room, results.winningChromosome, results.fitness, io)
    rooms[finishedTask.room].emptyTaskQueue()
  } else {
    if (rooms[finishedTask.room].totalTasks() > 0) {
      rooms[finishedTask.room].distributeWork(socket)
      // the following code below needs to be refactored and placed into functions
      io.sockets.sockets[socket.id].emit(
        'CALL_' + finishedTask.room,
        rooms[finishedTask.room].tasks.shift(),
      )
    }
    rooms[finishedTask.room].createMoreTasks(finishedTask)
  }

  io.sockets.emit('UPDATE_' + finishedTask.room, getRoom(rooms[finishedTask.room]))
  console.log(chalk.green('DONE: '), socket.id, finishedTask.room)
}

function algorithmDone(room, winningChromosome, fitness, io) {
  const endTime = Date.now()
  console.log(
    chalk.green(`DURATION OF ${room}: `, endTime - room.start)
  )

  console.log(
    chalk.magenta(`BEST CHROMOSOME: ${winningChromosome}`)
  )

  console.log(
    chalk.magenta(`BEST FITNESS: ${fitness}`)
  )

  io.sockets.emit('UPDATE_' + room, getRoom(room))
  rooms[room].stopJob()
}
