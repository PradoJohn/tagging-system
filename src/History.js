import React from "react";

function History({ history }) {
  return (
    <div>
      <div>
        <h4
          style={{
            color: "lightgreen",
            display: "inline-block",
            marginRight: "10px",
          }}
        >
          Tags are always correct!
        </h4>
        <p style={{ color: "red", display: "inline-block" }}>
          Unless <strong>REI</strong> in the table is incorrect
        </p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Field #</th>
            <th>Default Start</th>
            <th>End</th>
            <th>REI</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item, index) => (
            <tr key={index}>
              <td>{item.fieldNumber}</td>
              <td>{item.subtractedTime}</td>
              <td>{item.startTime}</td>
              <td>{item.selectedValue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default History;
