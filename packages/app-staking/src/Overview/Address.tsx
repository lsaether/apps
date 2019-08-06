/* eslint-disable @typescript-eslint/camelcase */
// Copyright 2017-2019 @polkadot/app-staking authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { AccountId, Balance, BlockNumber, Exposure } from '@polkadot/types/interfaces';
import { DerivedBalancesMap, DerivedStaking, DerivedStakingOnlineStatus } from '@polkadot/api-derive/types';
import { I18nProps } from '@polkadot/ui-app/types';
import { ValidatorFilter } from '../types';

import React from 'react';
import styled from 'styled-components';
import { withCalls, withMulti } from '@polkadot/ui-api/with';
import { AddressCard, AddressMini, OnlineStatus } from '@polkadot/ui-app';
import keyring from '@polkadot/ui-keyring';
import { formatBalance } from '@polkadot/util';
import { updateOnlineStatus } from '../util';

import translate from '../translate';

interface Props extends I18nProps {
  address: string;
  balances: DerivedBalancesMap;
  className?: string;
  defaultName: string;
  filter: ValidatorFilter;
  lastAuthor: string;
  lastBlock: string;
  recentlyOnline?: Record<string, BlockNumber>;
  staking_info?: DerivedStaking;
}

interface State {
  controllerId: string | null;
  onlineStatus: DerivedStakingOnlineStatus;
  stashActive: string | null;
  stashTotal: string | null;
  sessionId: string | null;
  stakers?: Exposure;
  stashId: string | null;
  badgeExpanded: boolean;
}

class Address extends React.PureComponent<Props, State> {
  public state: State;

  public constructor (props: Props) {
    super(props);

    this.state = {
      controllerId: null,
      onlineStatus: {},
      sessionId: null,
      stashActive: null,
      stashId: null,
      stashTotal: null,
      badgeExpanded: false
    };
  }

  public static getDerivedStateFromProps ({ recentlyOnline = {}, staking_info }: Props, prevState: State): Pick<State, never> | null {
    if (!staking_info) {
      return null;
    }

    const { controllerId, nextSessionId, online, offline, stakers, stakingLedger, stashId } = staking_info;

    return {
      controllerId: controllerId && controllerId.toString(),
      onlineStatus: updateOnlineStatus(recentlyOnline)(controllerId || null, { offline, online }),
      sessionId: nextSessionId && nextSessionId.toString(),
      stashActive: stakingLedger
        ? formatBalance(stakingLedger.active)
        : prevState.stashActive,
      stakers,
      stashId: stashId && stashId.toString(),
      stashTotal: stakingLedger
        ? formatBalance(stakingLedger.total)
        : prevState.stashTotal
    };
  }

  public render (): React.ReactNode {
    const { className, defaultName, filter } = this.props;
    const { controllerId, stakers, stashId } = this.state;
    const bonded = stakers && !stakers.own.isEmpty
      ? [stakers.own.unwrap(), stakers.total.unwrap().sub(stakers.own.unwrap())]
      : true;

    if ((filter === 'hasNominators' && !this.hasNominators()) ||
      (filter === 'noNominators' && this.hasNominators()) ||
      (filter === 'hasWarnings' && !this.hasWarnings()) ||
      (filter === 'noWarnings' && this.hasWarnings()) ||
      (filter === 'iNominated' && !this.iNominated())) {
      return null;
    }

    return (
      <AddressCard
        buttons={this.renderKeys()}
        className={className}
        defaultName={defaultName}
        iconInfo={this.renderOnlineStatus()}
        key={stashId || controllerId || undefined}
        value={stashId}
        withBalance={{ bonded }}
      >
        {this.renderNominators()}
      </AddressCard>
    );
  }

  private renderKeys (): React.ReactNode {
    const { address, lastAuthor, lastBlock, t } = this.props;
    const { controllerId, sessionId, stashId } = this.state;
    const isSame = controllerId === sessionId;
    const isAuthor = [address, controllerId, stashId].includes(lastAuthor);

    return (
      <div className='staking--Address-info'>
        {isAuthor && stashId
          ? <div className='blockNumber'>#{lastBlock}</div>
          : null
        }
        {controllerId
          ? (
            <div>
              <label className='staking--label'>{
                isSame
                  ? t('controller/session')
                  : t('controller')
              }</label>
              <AddressMini value={controllerId} />
            </div>
          )
          : null
        }
        {!isSame && sessionId
          ? (
            <div>
              <label className='staking--label'>{t('session')}</label>
              <AddressMini value={sessionId} />
            </div>
          )
          : null
        }
      </div>
    );
  }

  private getNominators (): [AccountId, Balance][] {
    const { stakers } = this.state;

    return stakers
      ? stakers.others.map(({ who, value }): [AccountId, Balance] => [who, value.unwrap()])
      : [];
  }

  private iNominated (): boolean {
    const nominators = this.getNominators();
    const myAddresses = keyring.getAccounts().map(({ address }): string => address);

    return nominators.some(([who]): boolean =>
      myAddresses.includes(who.toString())
    );
  }

  private hasNominators (): boolean {
    const nominators = this.getNominators();

    return !!nominators.length;
  }

  private hasWarnings (): boolean {
    const { stashId, onlineStatus } = this.state;

    if (!stashId || !onlineStatus.offline || !onlineStatus.offline.length) {
      return false;
    }

    return true;
  }

  private renderNominators (): React.ReactNode {
    const { t } = this.props;
    const nominators = this.getNominators();

    if (!nominators.length) {
      return null;
    }

    return (
      <details>
        <summary>
          {t('Nominators ({{count}})', {
            replace: {
              count: nominators.length
            }
          })}
        </summary>
        {nominators.map(([who, bonded]): React.ReactNode =>
          <AddressMini
            bonded={bonded}
            key={who.toString()}
            value={who}
            withBonded
          />
        )}
      </details>
    );
  }

  private renderOnlineStatus (): React.ReactNode {
    const { controllerId, onlineStatus } = this.state;
    if (!controllerId || !onlineStatus) {
      return null;
    }

    return (
      <OnlineStatus
        accountId={controllerId}
        value={onlineStatus}
        tooltip
      />
    );
  }
}

export default withMulti(
  styled(Address as React.ComponentClass<Props>)`
    .blockNumber {
      background: #3f3f3f;
      border-radius: 0.25rem;
      top: 0rem;
      box-shadow: 0 3px 3px rgba(0,0,0,.2);
      color: #eee;
      font-size: 1.5rem;
      font-weight: 100;
      line-height: 1.5rem;
      padding: 0.25rem 0.5rem;
      position: absolute;
      right: -0.75rem;
      vertical-align: middle;
      z-index: 1;
    }
  `,
  translate,
  withCalls<Props>(
    ['derive.staking.info', { paramName: 'address' }]
  )
);
