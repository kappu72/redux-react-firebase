import React, {Component, PropTypes} from 'react'
import {watchEvents, unWatchEvents} from './actions'
import {connect} from 'react-redux'
import _ from 'lodash'

import * as helpers from './helpers'

const defaultEvent = {
  path: '',
  type: 'value'
}

const fixPath = (path) =>  ((path.substring(0,1) == '/') ? '': '/') + path

const ensureCallable = maybeFn =>
  typeof maybeFn === 'function' ? maybeFn : (_ => maybeFn)

const flatMap = arr =>  (arr && arr.length) ? arr.reduce( (a,b ) => a.concat(b) ) : []

const createEvents = ({type, path}) => {
  switch(type) {

    case 'value':
      return [{name: 'value', path}]

    case 'all':
      return [
        {name:'child_added', path},
        {name:'child_removed', path},
        {name:'child_moved', path},
        {name:'child_changed', path},
      ]

    default:
      return []
  }
}

const transformEvent = event => Object.assign({}, defaultEvent, event)

const getEventsFromDefinition = def => flatMap( def.map( path => {
  if(typeof path === 'string' || path instanceof String) {
    return createEvents(transformEvent({ path }))
  }

  if(typeof path == 'array' || path instanceof Array){
    return createEvents(transformEvent({ type: 'all', path: path[0]}))
  }

  if(typeof path == 'object' || path instanceof Object){
    const type = path.type || 'value'
    switch(type){
      case 'value':
        return createEvents(transformEvent({ path: path.path}))

      case 'array':
        return createEvents(transformEvent({ type: 'all', path: path.path}))
    }
  }

  return []
}))

export default (dataOrFn = []) => WrappedComponent => {

  class FirebaseConnect extends Component {

    constructor(props, context){
      super(props, context)
      this._firebaseEvents = []
    }

    static contextTypes = {
      store: PropTypes.object
    };

    componentWillMount() {
      const {firebase, dispatch} = this.context.store

      const linkFn = ensureCallable(dataOrFn)
      const data = linkFn(this.props, firebase)

      this._firebaseEvents = getEventsFromDefinition(data)
      watchEvents(firebase, dispatch, this._firebaseEvents)
    }

    componentWillUnmount() {
      const {firebase} = this.context.store
      unWatchEvents(firebase, this._firebaseEvents)
    }


    render() {
      return (
        <WrappedComponent
          {...this.props}
          {...this.state}
          firebase={this.context.store.firebase}
        />
      )
    }
  }

  return FirebaseConnect
}
