'use strict';

looker.plugins.visualizations.add({
    create: function(element, config) {
        element.innerHTML = `
            <style>
            .campaigns-table {
                background: #ffffff;
                font-family: Avenir Next;
            }
            .campaign {
                display: block;
                background: #f3f3f3;
                margin-bottom: 10px;
                border-radius: 5px;
                min-height: 70px;
                display: flex;
                flex-direction: row;
                cursor: pointer;
            }

            .campaign-left {
                flex-grow: 1;
                padding: 10px;
            }
            .campaign-left-name {
                font-size: 20px;
                color: #434343;
            }
            .campaign-left-duedate {
                font-size: 16px;
                color: #989898;
                padding-top: 5px;
            }

            .campaign-right {
                flex-grow: 1;
                text-align: right;
                padding: 10px;
            }
            .campaign-right-progress {
                font-size: 24px;
                color: #70AC39;
            }
            .campaign-right-sent {
                font-size: 16px;
                color: #989898;
                padding-top: 5px;
            }
            </style>
            <div class="campaigns-table"></div>
        `;
    },
    normalizeData: function (data) {
        const campaignsMap = new Map();

        for (let row of data) {
            const id = row['pi_campaign.id'].value;
            if (!campaignsMap.has(id)) {
                campaignsMap.set(id, {
                    id: id,
                    name: row['pi_campaign.campaign'].value,
                    duedate: new Date(row['pi_campaign.due_date'].value),
                    responses: 0,
                    sent: row['pi_campaign.number_sent'].value,
                    activity: []
                });
            }

            const campaign = campaignsMap.get(id);

            campaign.responses += row['pi_campaign_activity.total_responses'].value;

            campaign.activity.push({
                date: new Date(row['pi_campaign_activity.date_date'].value),
                count: row['pi_campaign_activity.response_running_total'].value
            });
        }

        let normalized = Array.from(campaignsMap.values());
        let sorted = normalized.sort((a, b) => a.duedate - b.duedate);

        sorted.forEach(campaign => {
            campaign.activity = campaign.activity.sort((a, b) => b.date - a.date);
        });

        return sorted;
    },
    pointsFromActivity: function (activity, total) {
        const points = [];
        const endDate = activity[0].date;
        const day = 24 * 60 * 60 * 1000;

        for (let i = 0; i < activity.length; i += 1) {
            let {date, count} = activity[i];
            const dayDiff = (endDate - date) / day;

            if (dayDiff > 100) {
                continue;
            }

            points.push([
                100 - dayDiff,
                100 - Math.round(100 * (count / total))
            ]);
        }

        points.push([
            points[points.length - 1][0],
            100
        ]);

        points.push([
            100,
            100
        ]);

        return points;
    },
    updateAsync: function(data, element, config, queryResponse, details, done) {
        let campaigns = this.normalizeData(data);
        let campaignsElement = element.querySelector('.campaigns-table');
        let elements = [];

        for (let campaign of campaigns) {
            let points = this.pointsFromActivity(campaign.activity, campaign.sent);
            let backgroundSVG = `<svg class="campaign-background" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" version="1.1" xmlns="http://www.w3.org/2000/svg"><polygon x="0%" y="0%" width="100" height="100" style="fill:#e4e4e4;" points="${points.map(p => p.join(',')).join(' ')}"/></svg>`
            let date = campaign.duedate;
            let campaignElement = document.createElement('div');
            campaignElement.setAttribute('class', 'campaign');
            campaignElement.style.backgroundImage = `url(data:image/svg+xml;utf8,${encodeURIComponent(backgroundSVG)})`;
            campaignElement.innerHTML = `
                <div class="campaign-left">
                    <div class="campaign-left-name">${campaign.name}</div>
                    <div class="campaign-left-duedate">${date.getMonth() + 1}/${date.getDate() + 1}/${date.getFullYear()}</div>
                </div>
                <div class="campaign-right">
                    <div class="campaign-right-progress">${
                        Math.round(100 * (campaign.responses / campaign.sent))
                    }%</div>
                    <div class="campaign-right-sent">
                        <svg width="12px" height="12px" viewBox="0 0 12 12" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                                <path d="M0.226652579,4.91944763 L4.68508961,7.31508516 L7.08149951,11.7720852 C7.1574956,11.9113665 7.30188816,12 7.46147994,12 C7.47161275,12 7.48174556,12 7.49187837,12 C7.66160296,11.9873381 7.80599553,11.8784455 7.8667924,11.7189051 L11.9731142,0.578937342 C12.0313779,0.421929386 11.9933798,0.244662338 11.8743193,0.125640177 C11.7552588,0.00661801635 11.5779346,-0.0313677796 11.420876,0.0268771075 L0.282383042,4.13440785 C0.122791262,4.19265273 0.0138635388,4.33953114 0.00119752448,4.50920103 C-0.0114684898,4.67887092 0.0771936102,4.83841126 0.226652579,4.91944763 Z M7.33349001,10 L5.83783784,6.71652593 L9.83783784,2 L7.33349001,10 Z M9.83783784,2 L5.12372445,6 L1.83783784,4.50434783 L9.83783784,2 Z" id="Shape" fill="#989898" fill-rule="nonzero"></path>
                            </g>
                        </svg>
                        ${campaign.sent}
                    </div>
                </div>
            `;
            let clickListener = function () {
                window.parent.parent.postMessage(JSON.stringify({type: 'campaign:click', id: campaign.id, name: campaign.name}), 'https://localhost:4443');
            };
            campaignElement.addEventListener('click', clickListener);
            campaignElement.clickListener = clickListener;
            elements.push(campaignElement);
        }

        for (let campaign of Array.from(campaignsElement.querySelectorAll('.campaign'))) {
            console.log('removing listener');
            if (campaign.clickListener) {
                campaign.removeEventListener('click', campaign.clickListener);
            }
            campaignsElement.removeChild(campaign);
        }
        elements.map(el => campaignsElement.appendChild(el));

        done();
    }
});
