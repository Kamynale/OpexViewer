import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Chart from '../../components/Chart/Chart';
import Backtest from '../../components/Backtest/Backtest';
import { getInstrument, getTradingSchedules } from '../../utils/instruments';
import { Spinner, FormGroup, Button, ButtonGroup } from 'reactstrap';

import { getFromSS, setToSS } from '../../utils/storage';

import DatePicker from 'react-datepicker';
const INIT_INTERVAL_TEXT = ['1 мин', '5 мин', '15 мин', '1 час'];

import 'react-datepicker/dist/react-datepicker.css';
import { getRobotLogs } from '../../utils/robots';

const INIT_INTERVAL = 1;

const SelectInterval = props => {
    const { setTickerInterval, interval, disabled } = props;

    const onButtonClick = React.useCallback(num => {
        // Задаёт интервал для всей страницы.
        // Этот интервал будет использован для построения графика.
        setTickerInterval(num);
        setToSS('interval', num);
    }, [setTickerInterval]);

    return (
        <ButtonGroup>
            {
                INIT_INTERVAL_TEXT.map((i, k) => (
                    <Button
                        key={k}
                        color="primary"
                        outline={interval !== k}
                        active={interval === k}
                        onClick={onButtonClick.bind(this, k)}
                        disabled={disabled}
                    >
                        {i}
                    </Button>
                ))
            }
        </ButtonGroup>
    );
};

const isToday = (date1, date2) => date1.toDateString() === date2.toDateString();

export default function TerminalFigi(props) {
    const {
        setTitle,
        serverUri,
        accountId,
        isRobotStarted,
        setIsRobotStarted,
    } = props;

    const router = useRouter();
    const routerPush = router.push;
    const { isReady } = router;

    const { figi } = router.query;

    const lsData = getFromSS();

    const [interval, setTickerInterval] = React.useState(lsData['interval'] || INIT_INTERVAL);
    const [inProgress, setInprogress] = React.useState(true);
    const [isTradingDay, setIsTradingDay] = React.useState();
    const [instrument, setInstrument] = React.useState();
    const [selectedDate, setSelectedDate] = React.useState(lsData['selectedDate'] && new Date(lsData['selectedDate']) || new Date());
    const [isBacktest, setIsBackTest] = useState(!isToday(new Date(), selectedDate));

    const getTradingSchedulesCb = React.useCallback(async (exchange, date) => {
        const currentDate = date || selectedDate;

        let isTradingDayParam = true;
        const today = new Date();

        // Проводятся ли торги можно запрашивать только для текущей и будущих дат.
        // Для прошлых считаем, что торги проводятся и смотрим на наличие исторических данных.
        if (isToday(currentDate, today) || currentDate >= today) {
            const schedule = await getTradingSchedules(serverUri, exchange, currentDate);

            if (schedule && schedule.exchanges) {
                isTradingDayParam = Boolean(schedule.exchanges[0].days[0].isTradingDay);
            }
        }

        setIsTradingDay(isTradingDayParam);
    }, [selectedDate, serverUri]);

    const onCalendareChange = React.useCallback(async date => {
        setSelectedDate(date);
        setToSS('selectedDate', date);

        instrument.exchange && getTradingSchedulesCb(instrument.exchange, date);
        setIsBackTest(!isToday(new Date(), new Date(date)));
    }, [instrument, getTradingSchedulesCb]);

    const getInstrumentCb = React.useCallback(async () => {
        const i = await getInstrument(serverUri, figi);

        if (!i || !i.ticker) {
            routerPush('/instruments');
        } else {
            setInstrument(i);
            await getTradingSchedulesCb(i.exchange);
            setInprogress(false);
        }
    }, [figi, routerPush, getTradingSchedulesCb, serverUri]);

    React.useEffect(() => {
        if (!isReady || instrument) {
            return;
        }

        if (!figi) {
            routerPush('/instruments');
        } else {
            getInstrumentCb();
        }
    }, [figi, instrument, isReady, getInstrumentCb, routerPush]);

    React.useEffect(() => {
        if (instrument) {
            let title = instrument.name + ` (${instrument.ticker})`;

            if (isBacktest) {
                title += '. Backtest.';
            }

            setTitle(title);
        }
    }, [setTitle, instrument, isBacktest]);

    return (<Content
        setInprogress={setInprogress}
        inProgress={inProgress}
        figi={figi}
        instrument={instrument}
        isTradingDay={isTradingDay}
        onCalendareChange={onCalendareChange}
        interval={interval}
        setTickerInterval={setTickerInterval}
        selectedDate={selectedDate}
        setIsTradingDay={setIsTradingDay}
        isBacktest={isBacktest}
        serverUri={serverUri}
        accountId={accountId}
        isRobotStarted={isRobotStarted}
        setIsRobotStarted={setIsRobotStarted}
    />);
}

const Head = props => {
    const {
        interval, onCalendareChange, setTickerInterval, selectedDate, isRobotStarted,
    } = props;

    const isWeekday = React.useCallback(date => {
        const day = new Date(date).getDay();

        return day !== 0 && day !== 6;
    }, []);

    return (
        <center>
            <FormGroup>
                <DatePicker
                    dateFormat="dd.MM.yyyy"
                    selected={selectedDate}
                    onChange={onCalendareChange}

                    maxDate={new Date()}
                    filterDate={isWeekday}
                    withPortal
                    disabled={Boolean(isRobotStarted)}
                />
            </FormGroup>
            <SelectInterval
                interval={interval}
                setTickerInterval={setTickerInterval}
                disabled={Boolean(isRobotStarted)}
            />
        </center>
    );
};

const Content = props => {
    const { serverUri,
        accountId,
        isRobotStarted,
        setIsRobotStarted,
        figi,
        selectedDate,
    } = props;

    useEffect(() => {
        (async () => {
            const logs = await getRobotLogs(serverUri, 'RandomExample', accountId, figi, selectedDate.getTime());
        })();
    }, [serverUri, accountId, figi, selectedDate]);

    return (
        <>
            <Head
                interval={props.interval}
                setTickerInterval={props.setTickerInterval}
                onCalendareChange={props.onCalendareChange}
                selectedDate={selectedDate}
                isRobotStarted={isRobotStarted}
            />
            {props.inProgress ? (
                <>
                    <center>
                        <br></br>
                        <Spinner color="primary">
                        Loading...
                        </Spinner>
                    </center>
                </>
            ) : ''}

            {props.isTradingDay ? (props.isBacktest ? (
                <Backtest
                    interval={props.interval}
                    setInprogress={props.setInprogress}
                    inProgress={props.inProgress}
                    selectedDate={props.selectedDate}
                    figi={figi}
                    instrument={props.instrument}
                    setIsTradingDay={props.setIsTradingDay}
                    serverUri={serverUri}
                    setIsRobotStarted={setIsRobotStarted}
                />
            ) : (
                <Chart
                    interval={props.interval}
                    setInprogress={props.setInprogress}
                    inProgress={props.inProgress}
                    selectedDate={props.selectedDate}
                    figi={figi}
                    instrument={props.instrument}
                    setIsTradingDay={props.setIsTradingDay}
                    serverUri={serverUri}
                    accountId={accountId}
                    setIsRobotStarted={setIsRobotStarted}
                    isRobotStarted={isRobotStarted}
                />
            )) : (<><br></br><br></br><center>Биржа закрыта.</center></>)}
        </>);
};
