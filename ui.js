// ui.js：操作面板与视图（原生 DOM，无弹窗）
import { render } from "./app.js";

export function mount(spec, parts) {
  parts.log.textContent = "事件 " + (spec.events || []).length + " 条，本轮时间片预算 " + (spec.budget || 0) + " 片。";

  function draw() {
    let view = null;
    try {
      view = render(spec);
    } catch (error) {
      parts.out.textContent = String(error && error.code ? error.code : error);
      parts.log.textContent = "跑不动：" + String(error && error.message ? error.message : error);
      return;
    }
    parts.out.textContent = JSON.stringify(view, null, 1);
    parts.stage.textContent = "";
    (view.used || []).forEach(function (row) {
      const line = document.createElement("div");
      line.className = "row";
      const head = document.createElement("span");
      head.textContent = "任务 " + row[0] + " 累计运行 " + row[1];
      line.appendChild(head);
      const chip = document.createElement("span");
      chip.className = "chip ok";
      chip.textContent = "已跑完";
      line.appendChild(chip);
      parts.stage.appendChild(line);
    });
    (view.pending_quanta || []).forEach(function (quantum) {
      const line = document.createElement("div");
      line.className = "row";
      const head = document.createElement("span");
      head.textContent = "时间片 " + quantum + " 压在账上";
      line.appendChild(head);
      const chip = document.createElement("span");
      chip.className = "chip warn";
      chip.textContent = "等收尾";
      line.appendChild(chip);
      parts.stage.appendChild(line);
    });
    parts.legend.textContent = "完成序列 " + JSON.stringify(view.done) + "，首轮时间片 "
      + view.slices_first + " 片，二档 " + view.slices_wide + " 片，收尾前账 "
      + view.pending_before + " 片，收尾补齐 " + view.catchup + " 片，收尾后账 " + view.pending_after + " 片";
    parts.log.textContent = "工作计数 " + view.judged + " / 上界 " + view.judged_bound
      + "，重放新时间片 " + view.replay_new + "，与全量对照差异 " + view.full_diff;
  }

  const budgetInput = document.createElement("input");
  budgetInput.type = "number";
  budgetInput.value = "2";
  parts.controls.appendChild(budgetInput);

  const runButton = document.createElement("button");
  runButton.className = "primary";
  runButton.textContent = "跑一遍";
  runButton.addEventListener("click", draw);
  parts.controls.appendChild(runButton);

  const budgetButton = document.createElement("button");
  budgetButton.textContent = "把时间片预算换成输入框的值";
  budgetButton.addEventListener("click", function () {
    const next = Number(budgetInput.value);
    spec.budget = Number.isFinite(next) ? Math.max(1, Math.round(next)) : 1;
    draw();
  });
  parts.controls.appendChild(budgetButton);

  const dropButton = document.createElement("button");
  dropButton.textContent = "删最后一条事件";
  dropButton.addEventListener("click", function () {
    spec.events = (spec.events || []).slice(0, Math.max(0, (spec.events || []).length - 1));
    draw();
  });
  parts.controls.appendChild(dropButton);

  draw();
}
