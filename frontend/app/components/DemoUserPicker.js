import { demoUsers } from "../../lib/constants";

export default function DemoUserPicker({ value, onChange }) {
  return (
    <label className="demo-user-picker">
      <span>Viewing as</span>
      <select aria-label="Viewing as" value={value} onChange={(event) => onChange(event.target.value)}>
        {demoUsers.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} · {user.department}
          </option>
        ))}
      </select>
    </label>
  );
}
