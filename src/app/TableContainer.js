import React, { Component } from 'react';
import FlipMove from 'react-flip-move';
import getPrintableNumber from '../auxiliary/getPrintableNumber';
import './TableContainer.css';


class TableContainer extends Component {
    constructor(props) {
        super(props);
        const changes = this.getChanges.bind(this)(null, this.props.startFromRound);
        this.state = Object.assign({
            currentRound: this.props.startFromRound,
            previousRound: null,
            areRoundsConsecutive: true,
            isPlaying: false,
            focusedItems: this.props.focusedItems ? new Set([...this.props.focusedItems]) : new Set(),
            mode: 'season'
        }, changes);
    }

    getChanges (previousRound, currentRound) {
        return [...this.props.results[currentRound].entries()].reduce((currentStats, [item, result]) => {
            const change = previousRound === null
                ? result.change
                : result.total - this.props.results[previousRound].get(item).total;

            return {
                maxAbsChange: Math.max(Math.abs(change), currentStats.maxAbsChange),
                maxAbsResultChange: Math.max(Math.abs(result.change), currentStats.maxAbsResultChange),
                allChangesMapped: currentStats.allChangesMapped && (result.result || result.change === null)
            }
        }, { maxAbsChange: 0, maxAbsResultChange: 0, allChangesMapped: true });
    }

    goToRound (roundNumber) {
        this.setState({ isMoving: false }, () => {
            const changes = this.getChanges.bind(this)(this.state.currentRound, roundNumber);
            return new Promise(resolve => this.setState(Object.assign({
                previousRound: this.state.currentRound,
                currentRound: roundNumber,
                areRoundsConsecutive: Math.abs(this.state.currentRound - roundNumber) === 1,
                isMoving: true
            }, changes), () => {
                return setTimeout(() => this.setState({ isMoving: false }, resolve), this.props.animationDuration);
            }));
        });
    }

    play () {
        if (this.state.currentRound >= this.props.lastRound) {
            this.setState({ isPlaying: false });
            return;
        }

        if (this.state.isPlaying) {
            const timeout = this.props.showChangeDuringAnimation ? this.props.animationDuration*2 : this.props.animationDuration;
            Promise.resolve(this.goToRound(this.state.currentRound + 1))
                .then(() => setTimeout(this.play.bind(this), timeout));
        }
    }

    handlePlayButton () {
        if (this.state.isPlaying) {
            this.setState({ isPlaying: false });
        } else {
            this.setState({ isPlaying: true, mode: 'season' }, () => {
                if (this.state.currentRound === this.props.lastRound) {
                    const timeout = this.props.showChangeDuringAnimation ? this.props.animationDuration*2 : this.props.animationDuration;
                    Promise.resolve(this.goToRound(0))
                        .then(() => setTimeout(this.play.bind(this), timeout))
                } else {
                    this.play.bind(this)()
                }
            });
        }
    }

    handlePreviousButton () {
        if(this.state.currentRound > 0) {
            this.goToRound(this.state.currentRound - 1)
        }
    }

    handleNextButton () {
        if(this.state.currentRound < this.props.lastRound) {
            this.goToRound(this.state.currentRound + 1);
        }
    }

    handleSelect (e) {
        this.goToRound(Number.parseInt(e.target.value, 10));
    }

    highlightRow (item) {
        const newFocusedItems = this.state.focusedItems;
        if (newFocusedItems.has(item)) {
            newFocusedItems.delete(item)
        } else {
            newFocusedItems.add(item);
        }
        this.setState({ focusedItems: newFocusedItems });
    }

    getRowStyle (result, change) {
        const styleObject = {};
        const resultClass = result.result;

        const customStyleNeeded = this.state.mode === 'round' && !this.state.allChangesMapped;
        const animationNeeded = this.state.isMoving && this.state.currentRound > 0;
        const customAnimationNeeded = animationNeeded && (!this.state.areRoundsConsecutive || !this.state.allChangesMapped);

        if (!animationNeeded) {
            if (customStyleNeeded) {
                const color = result.change >= 0 ? '94,179,26' : '179,82,82';
                const changeIntensity = result.change
                    ? Math.max(Math.round(10*Math.abs(result.change)/this.state.maxAbsResultChange)/10, 0.1)
                    : 0;
                styleObject.backgroundColor = `rgba(${color},${changeIntensity})`;
            }
        } else {
            if (customAnimationNeeded) {
                const color = change >= 0 ? 'green' : 'red';
                const changeIntensity = change
                    ? Math.max(10*Math.round(10*Math.abs(change)/this.state.maxAbsChange), 0.1)
                    : 0;
                styleObject.animation = `${color}-${changeIntensity} ${this.props.animationDuration}ms`
            } else {
                styleObject.animation = `${resultClass} ${this.props.animationDuration}ms`;
            }
        }

        return styleObject;
    }

    getRowClasses (item, result) {
        const classes = ['row'];
        if (this.state.mode === 'round' && result.result) {
            classes.push(result.result);
        }

        if (this.state.focusedItems.size === 0 || this.state.focusedItems.has(item)) {
            classes.push('focus')
        }

        return classes.join(' ');
    }

    getTotalText (result, change) {
        if (this.state.currentRound === 0) {
            return result.total;
        }

        const shouldAnimateChange =  this.state.isMoving && (this.props.showChangeDuringAnimation || !this.state.areRoundsConsecutive);
        if (shouldAnimateChange) {
            return getPrintableNumber(change, true);
        } else {
            switch (this.state.mode) {
                case 'round':
                    return getPrintableNumber(result.change, true);
                case 'season':
                    return getPrintableNumber(result.total);
            }
        }
    }


    render() {
        return (
            <div className="replay-table-wrap">

                <div className="replay-table-controls">

                    {this.props.modes.length <= 1 ? null :
                    <div className="replay-table-check">
                        {this.props.modes.map(mode => {
                            return(
                                <div key={mode} className="replay-table-mode-option">
                                    <input type="radio"
                                           id={`${this.props.tableName || ''}-${mode}-radio`}
                                           name={`${this.props.tableName || ''}-mode-switch`}
                                           value={mode}
                                           checked={this.state.mode === mode}
                                           onChange={() => this.setState({mode: mode})}/>

                                    <label htmlFor={`${this.props.tableName || ''}-${mode}-radio`}>
                                        {this.props[mode + 'Name']}
                                    </label>
                                </div>
                            );
                        })}

                    </div>
                    }


                    <div className="replay-table-controls-left">

                        <div className="replay-table-start-control">
                            <div
                                className={this.state.isPlaying
                            ? 'pause'
                            : this.state.currentRound === this.props.lastRound ? 'replay' : 'play'}
                                onClick={this.handlePlayButton.bind(this)} />
                        </div>

                        <div
                            className={`previous ${this.state.currentRound === 0? 'disabled' : ''}`}
                            onClick={this.handlePreviousButton.bind(this)}>
                            &lt;
                        </div>

                        <div
                            className={`next ${this.state.currentRound === this.props.lastRound? 'disabled' : ''}`}
                            onClick={this.handleNextButton.bind(this)}>
                            &gt;
                        </div>

                        <select className="replay-table-select" onChange={this.handleSelect.bind(this)} value={this.state.currentRound}>
                            {this.props.roundsNames.map((name, i) =>
                                <option key={i} value={i}>{name}</option>)}
                        </select>

                    </div>

                    {!this.props.showProgressBar ? null :
                    <div className="replay-table-progress-wrap">
                         <progress
                             className="replay-table-progress"
                             value={this.state.currentRound}
                             max={this.props.roundsTotalNumber || this.props.roundsNames.length - 1} />
                    </div>
                    }


                </div>

                <table className="r-table">
                    <thead>
                    <tr>
                        <th className="position">{this.props.positionName}</th>
                        <th className="item">{this.props.itemName}</th>
                        {Object.keys(this.props['calculatedColumns']).map(key => {
                            const name = this.props['calculatedColumns'][key];
                            return <th key={name} className="calculated">{name}</th>;
                        })}
                        {this.props['extraColumnsNames'].map(name => <th className="extra" key={name}>{name}</th>)}
                        <th className="total">{this.props.totalName}</th>
                    </tr>
                    </thead>
                    <FlipMove
                        delay={this.props.animationDuration/2}
                        duration={this.props.animationDuration/2}
                        typeName='tbody' >

                        {[...this.props.results[this.state.currentRound].entries()]
                            .map(([item, result]) => {
                                const change = this.state.areRoundsConsecutive
                                    ? result.change
                                    : result.total - this.props.results[this.state.previousRound].get(item).total;

                                return (
                                    <tr key={item}
                                        style={this.getRowStyle.bind(this)(result, change)}
                                        className={this.getRowClasses.bind(this)(item, result)}
                                        onClick={() => this.highlightRow(item)}>

                                        <td className="position">{result.position}</td>
                                        <td className="item">{item}</td>
                                        {Object.keys(this.props['calculatedColumns']).map(key =>
                                            <td key={key} className="calculated">{result[key]}</td>
                                        )}
                                        {this.props.extraColumnsNames.map(name =>
                                            <td key={name} className="extras">{result.extras[name]}</td>
                                        )}
                                        <td className="total">{this.getTotalText.bind(this)(result, change)}</td>
                                    </tr>
                                );
                            })}
                    </FlipMove>
                </table>
            </div>
        );
    }
}

export default TableContainer;
