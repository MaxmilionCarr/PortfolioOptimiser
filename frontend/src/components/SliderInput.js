import React from 'react';
import './SliderInput.css';

export default function SliderInput({
                                        label,
                                        min,
                                        max,
                                        step,
                                        value,
                                        onChange,
                                    }) {
    // keep slider & box in sync
    const handleSlider = e => onChange(parseFloat(e.target.value));

    const handleInput  = e => {
        let v = parseFloat(e.target.value);
        if (isNaN(v)) return;
        if (v < min) v = min;
        if (v > max) v = max;
        onChange(v);
    };

    const handleBlur = e => {
        let v = parseFloat(e.target.value);
        if (isNaN(v) || v < min) onChange(min);
        else if (v > max) onChange(max);
    }

    return (
        <div className="slider-group">
            <label className="slider-label">{label}</label>
            <div className="slider-row">
                <input
                    type="range"
                    className="slider"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={handleSlider}
                />
                <input
                    type="number"
                    className="slider-box"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={handleInput}
                    onBlur={handleBlur}
                />
            </div>
        </div>
    );
}
