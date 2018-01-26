import React, { Component } from 'react'
import times from 'lodash/times'
import './style.css'
import map from 'lodash/map'
import ReactLoading from 'react-loading';
import CodeEditor from '../CodeEditor/CodeEditor'
import Slider from 'material-ui/Slider';
import './style.css'

import axios from 'axios'

import {
  DropdownButton,
  MenuItem,
  Well
} from 'react-bootstrap'

class AlgorithmInputs extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectionFuncs: [],
      mutationFuncs: [],
    }
  }
  componentDidMount() {
    this.fetchMutuationAlgorithms();
    this.fetchSelectionAlgorithms();
  }
  fetchMutuationAlgorithms() {
    axios.get('/api/mutation-algs')
      .then(funcs => this.setState({ mutationFuncs: funcs.data }))
  }
  fetchSelectionAlgorithms() {
    axios.get('/api/selection-algs')
      .then(funcs => this.setState({ selectionFuncs: funcs.data }))
  }
  saveFitnessFunc(func) {
    axios.post('/api/fitnessFunc', func)
      .then(fitnessFunc => this.setState({ fitnessFunc }))
  }

  render() {
    return (
      <div id="scientist-inputs">
        <div id="code-editor">
          <CodeEditor />
        </div>
        <div>
          <DropdownButton
            onSelect={(e) => this.props.setSelectionFunc({ currentSelectionFunc: this.state.selectionFuncs[e] })}
            title={(this.props.currentSelectionFunc && this.props.currentSelectionFunc.name) || 'Select a Selection Algorithm'}
            id="selection-algorithm-dropdown"
          >
            {this.state.selectionFuncs.map((func, idx) =>
              <MenuItem key={func.id} eventKey={idx}>{func.name}</MenuItem>
            )}
          </DropdownButton>

          <DropdownButton onSelect={(e => this.props.setMutationFuncs(
            { currentMutationFunc: this.state.mutationFuncs[e] }))}
            title={(this.props.currentMutationFunc && this.props.currentMutationFunc.name) || 'Select a Mutation Algorithm'}
            id="mutations-algorithm-dropdown"
          >
            {this.state.mutationFuncs.map((func, idx) =>
              <MenuItem key={func.id} eventKey={idx}>{func.name}</MenuItem>
            )}
          </DropdownButton>
          <div className="sliders">
            <div className="slider">
              <h5>Population Size</h5>
              <Well className="input-information-well">{this.props.population}</Well>
              <Slider
                className="scientist-input-sliders"
                onChange={(e, pop) => this.props.setPopulationSize(pop)}
                value={this.props.population}
                style={{ width: 200 }}
                defaultValue={this.props.population}
                min={100}
                max={1000}
                step={2}
              />
            </div>
            <div className="slider">
              <h5>Number of Generations</h5>
              <Well className="input-information-well">{this.props.generations}</Well>
              <Slider
                className="scientist-input-sliders"
                onChange={(e, pop) => this.props.setGenerations(pop)}
                value={this.props.generations}
                style={{ width: 200 }}
                defaultValue={this.props.generations}
                min={5}
                max={50}
                step={1}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default AlgorithmInputs
