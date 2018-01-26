import React, { Component } from 'react'
import {
  Tabs,
  Tab
} from 'react-bootstrap'

import axios from 'axios'

import TravelingSalesmanAdminInputs from '../components/TravelingSalesmanAdminInputs/TravelingSalesmanAdminInputs';

import {
  StatusBulbs,
  LastExecutionInfo,
  ConsoleOutput,
  HistoryTable,
  Toolbar
} from '../components'

const GENETIC_ALG = 'GENETIC_ALG'
const ADMIN_JOIN = 'ADMIN_JOIN'
const REQUEST_ROOM = 'REQUEST_ROOM'
const TOGGLE_MULTITHREADED = 'TOGGLE_MULTITHREADED'
const UPDATE_GENETIC_ALG = 'UPDATE_GENETIC_ALG'
const UPDATE_HISTORY_GENETIC_ALG = 'UPDATE_HISTORY_GENETIC_ALG'
const START_GENETIC_ALG = 'START_GENETIC_ALG'


class ScientistView extends Component {
  constructor(props) {
    super(props)
    this.state = {
      room: {
        multiThreaded: false,
        nodes: {},
        jobRunning: false
      },
      history: [],
      fitnessFunc: {},
      population: 500,
      generations: 10,
      currentSelectionFunc: {},
      currentMutationFunc: {},
    }
    this.setFitnessFunc = this.setFitnessFunc.bind(this);
    this.setMutationFuncs = this.setMutationFuncs.bind(this);
    this.setSelectionFunc = this.setSelectionFunc.bind(this);
    this.setPopulationSize = this.setPopulationSize.bind(this);
    this.setGenerations = this.setGenerations.bind(this);
  }
  componentDidMount() {
    axios.get('/api/history/' + GENETIC_ALG).then((history) => {
      this.setState({ history: history.data })
    })

    this.props.socket.on(UPDATE_GENETIC_ALG, (room) => {
      this.setState({ room })
    })

    this.props.socket.on(UPDATE_HISTORY_GENETIC_ALG, (history) => {
      this.setState({ history })
    })

    this.props.socket.emit(ADMIN_JOIN, GENETIC_ALG)

    this.props.socket.emit(REQUEST_ROOM, GENETIC_ALG)

    this.props.socket.on('disconnect', () => {
      this.props.socket.on('connect', () => {
        this.props.socket.emit('ADMIN_JOIN', GENETIC_ALG)
      })
    })
  }

  startJob(evt) {
    let parameters = {
      params: {
        fitnessFunc: this.state.fitnessFunc,
        population: this.state.population,
        generations: this.state.generations,
        currentSelectionFunc: this.startJob.currentSelectionFunc.id,
        currentMutationFunc: this.state.currentMutationFunc.id,
      },
      room: this.state.room
    }
    this.props.socket.emit(START_GENETIC_ALG, parameters)
  }

  abortJob(evt) {
    this.props.socket.emit('ABORT', GENETIC_ALG)
  }

  toggleMultiThreaded(evt) {
    this.props.socket.emit(TOGGLE_MULTITHREADED, { value: !this.state.room.multiThreaded, room: GENETIC_ALG })
  }

  setFitnessFunc(fitnessFunc) {
    this.setState( { fitnessFunc } );
  }

  setMutationFuncs(currentMutationFunc) {
    this.setState( currentMutationFunc );
  }

  setSelectionFunc(currentSelectionFunc) {
    this.setState( currentSelectionFunc );
  }

  setPopulationSize(population) {
    this.setState( { population } );
  }

  setGenerations(generations) {
    this.setState( { generations } );
  }

  render() {
    // this sorts the table as a side effect
    const mostRecent = this.state.history.length && this.state.history.sort((a, b) => new Date(b.endTime) - new Date(a.endTime))[0]
    const runTime = (new Date(mostRecent.endTime) - new Date(mostRecent.startTime)) / 1000
    return (
      <div>
        <div className="algo-name-header-wrapper">
          <h2>Travelling Salesman Demo</h2>
          <p>
            For each task node for this algorithim finds a subset of the permutations neccesary to determine the shortest tour and send the results back to the root node.
          </p>
        </div>
        <TravelingSalesmanAdminInputs
          setFitnessFunc={this.setFitnessFunc}
          setMutationFuncs={this.setMutationFuncs}
          setSelectionFunc={this.setSelectionFunc}
          setPopulationSize={this.setPopulationSize}
          setGenerations={this.setGenerations}
          currentSelectionFunc={this.state.currentSelectionFunc}
          currentMutationFunc={this.state.currentMutationFunc}
          population={this.state.population}
          generations={this.state.generations}
        />
        <Toolbar
          startJob={this.startJob.bind(this)}
          abortJob={this.abortJob.bind(this)}
          toggleMultiThreaded={this.toggleMultiThreaded.bind(this)}
          jobRunning={this.state.room.jobRunning}
          multiThreaded={this.state.room.multiThreaded || false}
          nodesInRoom={Object.keys(this.state.room.nodes || {}).length > 0}
        />
        <div><em>Node count: {(this.state.room.nodes) ? Object.keys(this.state.room.nodes).length : 0}</em></div>
        <StatusBulbs nodes={this.state.room.nodes} />
        <LastExecutionInfo result={mostRecent.result} runTime={runTime} />
        <Tabs defaultActiveKey={1} animation={false} id="noanim-tab-example">
          <Tab style={{ marginTop: '0.5em' }} eventKey={1} title="History">
            <HistoryTable data={this.state.history} />
          </Tab>
          <Tab style={{ marginTop: '0.5em' }} eventKey={2} title="Output">
            <ConsoleOutput />
          </Tab>
        </Tabs>
      </div >
    )
  }
}

export default ScientistView
