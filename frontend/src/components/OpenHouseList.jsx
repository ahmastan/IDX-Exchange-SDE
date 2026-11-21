import {
  formatOpenHouseDate,
  formatTimeRange,
  getOpenHouseRemarks,
  isPastOpenHouse,
} from "../utils/openHouses";
import "./OpenHouseList.css";

// Open houses for one listing, in the order the API returns them (by date,
// then start time). `openHouses` is the array from fetchOpenHouses.
export default function OpenHouseList({ openHouses }) {
  if (!openHouses || openHouses.length === 0) {
    return <p className="open-houses__empty">No open houses scheduled</p>;
  }

  return (
    <ul className="open-houses">
      {openHouses.map((openHouse, i) => {
        const date = formatOpenHouseDate(openHouse.OpenHouseDate) ?? "Date to be announced";
        const time = formatTimeRange(openHouse.OH_StartTime, openHouse.OH_EndTime);
        // Remarks are inside the all_data JSON blob; parse it here, not in the API
        const remarks = getOpenHouseRemarks(openHouse.all_data);
        const past = isPastOpenHouse(openHouse.OpenHouseDate);

        return (
          <li key={openHouse.id ?? i} className={`open-houses__item${past ? " open-houses__item--past" : ""}`}>
            <div className="open-houses__when">
              <p className="open-houses__date">
                {date}
                {past && <span className="open-houses__badge">Past</span>}
              </p>
              {time && <p className="open-houses__time">{time}</p>}
            </div>
            {remarks && <p className="open-houses__remarks">{remarks}</p>}
          </li>
        );
      })}
    </ul>
  );
}
